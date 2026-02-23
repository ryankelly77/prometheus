-- ============================================================================
-- PROMETHEUS ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Apply these policies via Supabase SQL Editor to enable multi-tenancy.
-- Policies ensure users can only access data within their organization scope.
-- ============================================================================
-- NOTE: Uses Supabase's built-in auth.uid() function (returns UUID)
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(organization_id),
    '{}'::TEXT[]
  )
  FROM public."UserOrganization"
  WHERE user_id = auth.uid()::text
    AND is_active = true;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get location IDs the current user can access
-- Respects role hierarchy and access scope rules
CREATE OR REPLACE FUNCTION public.get_accessible_location_ids()
RETURNS TEXT[] AS $$
DECLARE
  user_memberships RECORD;
  location_ids TEXT[] := '{}';
BEGIN
  FOR user_memberships IN
    SELECT
      uo.role,
      uo.organization_id,
      uo.restaurant_group_ids,
      uo.location_ids
    FROM public."UserOrganization" uo
    WHERE uo.user_id = auth.uid()::text
      AND uo.is_active = true
  LOOP
    -- SUPER_ADMIN and PARTNER_ADMIN get all locations in org
    IF user_memberships.role IN ('SUPER_ADMIN', 'PARTNER_ADMIN') THEN
      location_ids := location_ids || ARRAY(
        SELECT l.id
        FROM public."Location" l
        JOIN public."RestaurantGroup" rg ON l.restaurant_group_id = rg.id
        WHERE rg.organization_id = user_memberships.organization_id
          AND l.is_active = true
      );
    -- Empty arrays = all locations in org
    ELSIF array_length(user_memberships.restaurant_group_ids, 1) IS NULL
      AND array_length(user_memberships.location_ids, 1) IS NULL THEN
      location_ids := location_ids || ARRAY(
        SELECT l.id
        FROM public."Location" l
        JOIN public."RestaurantGroup" rg ON l.restaurant_group_id = rg.id
        WHERE rg.organization_id = user_memberships.organization_id
          AND l.is_active = true
      );
    ELSE
      -- Add locations from restaurant groups
      IF array_length(user_memberships.restaurant_group_ids, 1) > 0 THEN
        location_ids := location_ids || ARRAY(
          SELECT l.id
          FROM public."Location" l
          WHERE l.restaurant_group_id = ANY(user_memberships.restaurant_group_ids)
            AND l.is_active = true
        );
      END IF;
      -- Add individual locations
      IF array_length(user_memberships.location_ids, 1) > 0 THEN
        location_ids := location_ids || user_memberships.location_ids;
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
  WHERE uo.user_id = auth.uid()::text
    AND uo.is_active = true;

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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DaypartMetrics') THEN
    ALTER TABLE public."DaypartMetrics" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DailyMetrics') THEN
    ALTER TABLE public."DailyMetrics" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MonthlyMetrics') THEN
    ALTER TABLE public."MonthlyMetrics" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CustomerLoyalty') THEN
    ALTER TABLE public."CustomerLoyalty" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Review') THEN
    ALTER TABLE public."Review" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ReviewMetrics') THEN
    ALTER TABLE public."ReviewMetrics" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WebsiteVisibility') THEN
    ALTER TABLE public."WebsiteVisibility" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PRMention') THEN
    ALTER TABLE public."PRMention" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'HealthScoreConfig') THEN
    ALTER TABLE public."HealthScoreConfig" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'HealthScoreHistory') THEN
    ALTER TABLE public."HealthScoreHistory" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WeatherData') THEN
    ALTER TABLE public."WeatherData" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LocalEvent') THEN
    ALTER TABLE public."LocalEvent" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Holiday') THEN
    ALTER TABLE public."Holiday" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Integration') THEN
    ALTER TABLE public."Integration" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'IntegrationStatus') THEN
    ALTER TABLE public."IntegrationStatus" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ApiLog') THEN
    ALTER TABLE public."ApiLog" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SocialAccount') THEN
    ALTER TABLE public."SocialAccount" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SocialMetrics') THEN
    ALTER TABLE public."SocialMetrics" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SocialPost') THEN
    ALTER TABLE public."SocialPost" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIPrompt') THEN
    ALTER TABLE public."AIPrompt" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIInsight') THEN
    ALTER TABLE public."AIInsight" ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIUsage') THEN
    ALTER TABLE public."AIUsage" ENABLE ROW LEVEL SECURITY;
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
  USING (organization_id = ANY(public.get_user_organization_ids()));

DROP POLICY IF EXISTS "Group admins can manage restaurant groups" ON public."RestaurantGroup";
CREATE POLICY "Group admins can manage restaurant groups"
  ON public."RestaurantGroup"
  FOR ALL
  USING (
    organization_id = ANY(public.get_user_organization_ids())
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
  USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own profile" ON public."UserProfile";
CREATE POLICY "Users can update their own profile"
  ON public."UserProfile"
  FOR UPDATE
  USING (id = auth.uid()::text);

-- Users can see other profiles in same org (for team views)
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public."UserProfile";
CREATE POLICY "Users can view profiles in their org"
  ON public."UserProfile"
  FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM public."UserOrganization"
      WHERE organization_id = ANY(public.get_user_organization_ids())
    )
  );

-- UserOrganization: Users can see memberships in their org
DROP POLICY IF EXISTS "Users can view org memberships" ON public."UserOrganization";
CREATE POLICY "Users can view org memberships"
  ON public."UserOrganization"
  FOR SELECT
  USING (organization_id = ANY(public.get_user_organization_ids()));

DROP POLICY IF EXISTS "Group admins can manage org memberships" ON public."UserOrganization";
CREATE POLICY "Group admins can manage org memberships"
  ON public."UserOrganization"
  FOR ALL
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Invitation: Scoped to org with role-based access
DROP POLICY IF EXISTS "Users can view invitations in their org" ON public."Invitation";
CREATE POLICY "Users can view invitations in their org"
  ON public."Invitation"
  FOR SELECT
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

DROP POLICY IF EXISTS "Group admins can manage invitations" ON public."Invitation";
CREATE POLICY "Group admins can manage invitations"
  ON public."Invitation"
  FOR ALL
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- PasswordResetToken: Users can only see their own tokens
DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public."PasswordResetToken";
CREATE POLICY "Users can view their own reset tokens"
  ON public."PasswordResetToken"
  FOR SELECT
  USING (user_id = auth.uid()::text);


-- ============================================================================
-- PHASE 2 TABLE POLICIES (Location-scoped)
-- Apply only if tables exist
-- ============================================================================

DO $$
BEGIN
  -- MonthlyMetrics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MonthlyMetrics') THEN
    DROP POLICY IF EXISTS "Users can view monthly metrics" ON public."MonthlyMetrics";
    CREATE POLICY "Users can view monthly metrics"
      ON public."MonthlyMetrics"
      FOR SELECT
      USING (location_id = ANY(public.get_accessible_location_ids()));

    DROP POLICY IF EXISTS "Admins can manage monthly metrics" ON public."MonthlyMetrics";
    CREATE POLICY "Admins can manage monthly metrics"
      ON public."MonthlyMetrics"
      FOR ALL
      USING (
        location_id = ANY(public.get_accessible_location_ids())
        AND public.has_role('GROUP_ADMIN')
      );
  END IF;

  -- HealthScoreConfig
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'HealthScoreConfig') THEN
    DROP POLICY IF EXISTS "Users can view health score config" ON public."HealthScoreConfig";
    CREATE POLICY "Users can view health score config"
      ON public."HealthScoreConfig"
      FOR SELECT
      USING (location_id = ANY(public.get_accessible_location_ids()));

    DROP POLICY IF EXISTS "Admins can manage health score config" ON public."HealthScoreConfig";
    CREATE POLICY "Admins can manage health score config"
      ON public."HealthScoreConfig"
      FOR ALL
      USING (
        location_id = ANY(public.get_accessible_location_ids())
        AND public.has_role('GROUP_ADMIN')
      );
  END IF;

  -- Holiday is a shared lookup table - all authenticated users can read
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Holiday') THEN
    DROP POLICY IF EXISTS "Authenticated users can view holidays" ON public."Holiday";
    CREATE POLICY "Authenticated users can view holidays"
      ON public."Holiday"
      FOR SELECT
      USING (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "Admins can manage holidays" ON public."Holiday";
    CREATE POLICY "Admins can manage holidays"
      ON public."Holiday"
      FOR ALL
      USING (public.has_role('PARTNER_ADMIN'));
  END IF;
END $$;


-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================
-- The service role (used by server-side code) bypasses RLS by default.
-- This is handled automatically by Supabase when using the service role key.


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant select on all tables to authenticated users (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update/delete to authenticated (RLS will control access)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_location_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
