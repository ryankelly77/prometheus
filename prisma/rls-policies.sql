-- ============================================================================
-- PROMETHEUS ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Apply these policies via Supabase SQL Editor to enable multi-tenancy.
-- Policies ensure users can only access data within their organization scope.
-- ============================================================================
-- NOTE: Column names use camelCase to match Prisma schema
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get current user ID from JWT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  );
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    ARRAY_AGG("organizationId"),
    '{}'::TEXT[]
  )
  FROM public."UserOrganization"
  WHERE "userId" = public.current_user_id()
    AND "isActive" = true;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get location IDs the current user can access
CREATE OR REPLACE FUNCTION public.get_accessible_location_ids()
RETURNS TEXT[] AS $$
DECLARE
  current_uid TEXT;
  user_memberships RECORD;
  location_ids TEXT[] := '{}';
BEGIN
  current_uid := public.current_user_id();

  FOR user_memberships IN
    SELECT
      uo.role,
      uo."organizationId",
      uo."restaurantGroupIds",
      uo."locationIds"
    FROM public."UserOrganization" uo
    WHERE uo."userId" = current_uid
      AND uo."isActive" = true
  LOOP
    -- SUPER_ADMIN and PARTNER_ADMIN get all locations in org
    IF user_memberships.role IN ('SUPER_ADMIN', 'PARTNER_ADMIN') THEN
      location_ids := location_ids || ARRAY(
        SELECT l.id
        FROM public."Location" l
        JOIN public."RestaurantGroup" rg ON l."restaurantGroupId" = rg.id
        WHERE rg."organizationId" = user_memberships."organizationId"
          AND l."isActive" = true
      );
    -- Empty arrays = all locations in org
    ELSIF array_length(user_memberships."restaurantGroupIds", 1) IS NULL
      AND array_length(user_memberships."locationIds", 1) IS NULL THEN
      location_ids := location_ids || ARRAY(
        SELECT l.id
        FROM public."Location" l
        JOIN public."RestaurantGroup" rg ON l."restaurantGroupId" = rg.id
        WHERE rg."organizationId" = user_memberships."organizationId"
          AND l."isActive" = true
      );
    ELSE
      -- Add locations from restaurant groups
      IF array_length(user_memberships."restaurantGroupIds", 1) > 0 THEN
        location_ids := location_ids || ARRAY(
          SELECT l.id
          FROM public."Location" l
          WHERE l."restaurantGroupId" = ANY(user_memberships."restaurantGroupIds")
            AND l."isActive" = true
        );
      END IF;
      -- Add individual locations
      IF array_length(user_memberships."locationIds", 1) > 0 THEN
        location_ids := location_ids || user_memberships."locationIds";
      END IF;
    END IF;
  END LOOP;

  RETURN ARRAY(SELECT DISTINCT unnest(location_ids));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has minimum role in any org
CREATE OR REPLACE FUNCTION public.has_role(min_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  role_hierarchy TEXT[] := ARRAY['VIEWER', 'LOCATION_MANAGER', 'GROUP_ADMIN', 'PARTNER_ADMIN', 'SUPER_ADMIN'];
  user_role_level INT;
  min_role_level INT;
BEGIN
  min_role_level := array_position(role_hierarchy, min_role);

  SELECT MAX(array_position(role_hierarchy, uo.role::TEXT))
  INTO user_role_level
  FROM public."UserOrganization" uo
  WHERE uo."userId" = public.current_user_id()
    AND uo."isActive" = true;

  RETURN COALESCE(user_role_level >= min_role_level, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RestaurantGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserOrganization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;

-- Phase 2 tables (enable only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MonthlyMetrics') THEN
    ALTER TABLE public."MonthlyMetrics" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthScoreConfig') THEN
    ALTER TABLE public."HealthScoreConfig" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthScoreHistory') THEN
    ALTER TABLE public."HealthScoreHistory" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Holiday') THEN
    ALTER TABLE public."Holiday" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;


-- ============================================================================
-- PHASE 1 TABLE POLICIES
-- ============================================================================

-- Organization: Users can see orgs they belong to
DROP POLICY IF EXISTS "Users can view their organizations" ON public."Organization";
CREATE POLICY "Users can view their organizations"
  ON public."Organization"
  FOR SELECT
  USING (id = ANY(public.get_user_organization_ids()));

DROP POLICY IF EXISTS "Partner admins can update their organization" ON public."Organization";
CREATE POLICY "Partner admins can update their organization"
  ON public."Organization"
  FOR UPDATE
  USING (
    id = ANY(public.get_user_organization_ids())
    AND public.has_role('PARTNER_ADMIN')
  );

-- RestaurantGroup: Scoped to user's organizations
DROP POLICY IF EXISTS "Users can view restaurant groups in their org" ON public."RestaurantGroup";
CREATE POLICY "Users can view restaurant groups in their org"
  ON public."RestaurantGroup"
  FOR SELECT
  USING ("organizationId" = ANY(public.get_user_organization_ids()));

DROP POLICY IF EXISTS "Group admins can manage restaurant groups" ON public."RestaurantGroup";
CREATE POLICY "Group admins can manage restaurant groups"
  ON public."RestaurantGroup"
  FOR ALL
  USING (
    "organizationId" = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Location: Scoped to accessible locations
DROP POLICY IF EXISTS "Users can view accessible locations" ON public."Location";
CREATE POLICY "Users can view accessible locations"
  ON public."Location"
  FOR SELECT
  USING (id = ANY(public.get_accessible_location_ids()));

DROP POLICY IF EXISTS "Group admins can manage locations" ON public."Location";
CREATE POLICY "Group admins can manage locations"
  ON public."Location"
  FOR ALL
  USING (
    id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- UserProfile: Users can see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public."UserProfile";
CREATE POLICY "Users can view their own profile"
  ON public."UserProfile"
  FOR SELECT
  USING (id = public.current_user_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public."UserProfile";
CREATE POLICY "Users can update their own profile"
  ON public."UserProfile"
  FOR UPDATE
  USING (id = public.current_user_id());

-- Users can see other profiles in same org (for team views)
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public."UserProfile";
CREATE POLICY "Users can view profiles in their org"
  ON public."UserProfile"
  FOR SELECT
  USING (
    id IN (
      SELECT "userId" FROM public."UserOrganization"
      WHERE "organizationId" = ANY(public.get_user_organization_ids())
    )
  );

-- UserOrganization: Users can see memberships in their org
DROP POLICY IF EXISTS "Users can view org memberships" ON public."UserOrganization";
CREATE POLICY "Users can view org memberships"
  ON public."UserOrganization"
  FOR SELECT
  USING ("organizationId" = ANY(public.get_user_organization_ids()));

DROP POLICY IF EXISTS "Group admins can manage org memberships" ON public."UserOrganization";
CREATE POLICY "Group admins can manage org memberships"
  ON public."UserOrganization"
  FOR ALL
  USING (
    "organizationId" = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Invitation: Scoped to org with role-based access
DROP POLICY IF EXISTS "Users can view invitations in their org" ON public."Invitation";
CREATE POLICY "Users can view invitations in their org"
  ON public."Invitation"
  FOR SELECT
  USING (
    "organizationId" = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

DROP POLICY IF EXISTS "Group admins can manage invitations" ON public."Invitation";
CREATE POLICY "Group admins can manage invitations"
  ON public."Invitation"
  FOR ALL
  USING (
    "organizationId" = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- PasswordResetToken: Users can only see their own tokens
DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public."PasswordResetToken";
CREATE POLICY "Users can view their own reset tokens"
  ON public."PasswordResetToken"
  FOR SELECT
  USING ("userId" = public.current_user_id());


-- ============================================================================
-- PHASE 2 TABLE POLICIES (Location-scoped)
-- ============================================================================

DO $$
BEGIN
  -- MonthlyMetrics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MonthlyMetrics') THEN
    DROP POLICY IF EXISTS "Users can view monthly metrics" ON public."MonthlyMetrics";
    CREATE POLICY "Users can view monthly metrics"
      ON public."MonthlyMetrics"
      FOR SELECT
      USING ("locationId" = ANY(public.get_accessible_location_ids()));

    DROP POLICY IF EXISTS "Admins can manage monthly metrics" ON public."MonthlyMetrics";
    CREATE POLICY "Admins can manage monthly metrics"
      ON public."MonthlyMetrics"
      FOR ALL
      USING (
        "locationId" = ANY(public.get_accessible_location_ids())
        AND public.has_role('GROUP_ADMIN')
      );
  END IF;

  -- HealthScoreConfig
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthScoreConfig') THEN
    DROP POLICY IF EXISTS "Users can view health score config" ON public."HealthScoreConfig";
    CREATE POLICY "Users can view health score config"
      ON public."HealthScoreConfig"
      FOR SELECT
      USING ("locationId" = ANY(public.get_accessible_location_ids()));

    DROP POLICY IF EXISTS "Admins can manage health score config" ON public."HealthScoreConfig";
    CREATE POLICY "Admins can manage health score config"
      ON public."HealthScoreConfig"
      FOR ALL
      USING (
        "locationId" = ANY(public.get_accessible_location_ids())
        AND public.has_role('GROUP_ADMIN')
      );
  END IF;

  -- HealthScoreHistory
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthScoreHistory') THEN
    DROP POLICY IF EXISTS "Users can view health score history" ON public."HealthScoreHistory";
    CREATE POLICY "Users can view health score history"
      ON public."HealthScoreHistory"
      FOR SELECT
      USING ("locationId" = ANY(public.get_accessible_location_ids()));
  END IF;

  -- Holiday is a shared lookup table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Holiday') THEN
    DROP POLICY IF EXISTS "Authenticated users can view holidays" ON public."Holiday";
    CREATE POLICY "Authenticated users can view holidays"
      ON public."Holiday"
      FOR SELECT
      USING (public.current_user_id() <> '');

    DROP POLICY IF EXISTS "Admins can manage holidays" ON public."Holiday";
    CREATE POLICY "Admins can manage holidays"
      ON public."Holiday"
      FOR ALL
      USING (public.has_role('PARTNER_ADMIN'));
  END IF;
END $$;


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_location_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
