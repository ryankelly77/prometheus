-- ============================================================================
-- PROMETHEUS ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Apply these policies via Supabase SQL Editor to enable multi-tenancy.
-- Policies ensure users can only access data within their organization scope.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_metadata')::json->>'sub'
  );
$$ LANGUAGE SQL STABLE;

-- Get organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(organization_id)
  FROM public."UserOrganization"
  WHERE user_id = auth.user_id()
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
    WHERE uo.user_id = auth.user_id()
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
  WHERE uo.user_id = auth.user_id()
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
ALTER TABLE public."SSOSession" ENABLE ROW LEVEL SECURITY;

-- Phase 2 tables
ALTER TABLE public."DaypartMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DailyMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MonthlyMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomerLoyalty" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReviewMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WebsiteVisibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PRMention" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HealthScoreConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HealthScoreHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WeatherData" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Holiday" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IntegrationStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ApiLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SocialAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SocialMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SocialPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AIPrompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AIInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AIUsage" ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- PHASE 1 TABLE POLICIES
-- ============================================================================

-- Organization: Users can see orgs they belong to
CREATE POLICY "Users can view their organizations"
  ON public."Organization"
  FOR SELECT
  USING (id = ANY(public.get_user_organization_ids()));

CREATE POLICY "Partner admins can update their organization"
  ON public."Organization"
  FOR UPDATE
  USING (
    id = ANY(public.get_user_organization_ids())
    AND public.has_role('PARTNER_ADMIN')
  );

-- RestaurantGroup: Scoped to user's organizations
CREATE POLICY "Users can view restaurant groups in their org"
  ON public."RestaurantGroup"
  FOR SELECT
  USING (organization_id = ANY(public.get_user_organization_ids()));

CREATE POLICY "Group admins can manage restaurant groups"
  ON public."RestaurantGroup"
  FOR ALL
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Location: Scoped to accessible locations
CREATE POLICY "Users can view accessible locations"
  ON public."Location"
  FOR SELECT
  USING (id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Group admins can manage locations"
  ON public."Location"
  FOR ALL
  USING (
    id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- UserProfile: Users can see their own profile
CREATE POLICY "Users can view their own profile"
  ON public."UserProfile"
  FOR SELECT
  USING (id = auth.user_id());

CREATE POLICY "Users can update their own profile"
  ON public."UserProfile"
  FOR UPDATE
  USING (id = auth.user_id());

-- Users can see other profiles in same org (for team views)
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
CREATE POLICY "Users can view org memberships"
  ON public."UserOrganization"
  FOR SELECT
  USING (organization_id = ANY(public.get_user_organization_ids()));

CREATE POLICY "Group admins can manage org memberships"
  ON public."UserOrganization"
  FOR ALL
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Invitation: Scoped to org with role-based access
CREATE POLICY "Users can view invitations in their org"
  ON public."Invitation"
  FOR SELECT
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

CREATE POLICY "Group admins can manage invitations"
  ON public."Invitation"
  FOR ALL
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- SSOSession: Scoped to org
CREATE POLICY "SSO sessions visible to org admins"
  ON public."SSOSession"
  FOR SELECT
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('PARTNER_ADMIN')
  );


-- ============================================================================
-- PHASE 2 TABLE POLICIES (Location-scoped)
-- ============================================================================

-- Metrics tables: Scoped to accessible locations
CREATE POLICY "Users can view daypart metrics"
  ON public."DaypartMetrics"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Users can view daily metrics"
  ON public."DailyMetrics"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Users can view monthly metrics"
  ON public."MonthlyMetrics"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Admins can manage metrics"
  ON public."DaypartMetrics"
  FOR ALL
  USING (
    location_id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

CREATE POLICY "Admins can manage daily metrics"
  ON public."DailyMetrics"
  FOR ALL
  USING (
    location_id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

CREATE POLICY "Admins can manage monthly metrics"
  ON public."MonthlyMetrics"
  FOR ALL
  USING (
    location_id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Customer loyalty
CREATE POLICY "Users can view customer loyalty"
  ON public."CustomerLoyalty"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

-- Reviews
CREATE POLICY "Users can view reviews"
  ON public."Review"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Users can view review metrics"
  ON public."ReviewMetrics"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

-- Website visibility
CREATE POLICY "Users can view website visibility"
  ON public."WebsiteVisibility"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

-- PR Mentions
CREATE POLICY "Users can view PR mentions"
  ON public."PRMention"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Admins can manage PR mentions"
  ON public."PRMention"
  FOR ALL
  USING (
    location_id = ANY(public.get_accessible_location_ids())
    AND public.has_role('LOCATION_MANAGER')
  );

-- Health Score
CREATE POLICY "Users can view health score config"
  ON public."HealthScoreConfig"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Admins can manage health score config"
  ON public."HealthScoreConfig"
  FOR ALL
  USING (
    location_id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

CREATE POLICY "Users can view health score history"
  ON public."HealthScoreHistory"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

-- Weather & Events
CREATE POLICY "Users can view weather data"
  ON public."WeatherData"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Users can view local events"
  ON public."LocalEvent"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

-- Holiday is a shared lookup table - all authenticated users can read
CREATE POLICY "Authenticated users can view holidays"
  ON public."Holiday"
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

CREATE POLICY "Admins can manage holidays"
  ON public."Holiday"
  FOR ALL
  USING (public.has_role('PARTNER_ADMIN'));

-- Integrations
CREATE POLICY "Users can view integrations"
  ON public."Integration"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Admins can manage integrations"
  ON public."Integration"
  FOR ALL
  USING (
    location_id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Integration status (org-level)
CREATE POLICY "Users can view integration status"
  ON public."IntegrationStatus"
  FOR SELECT
  USING (organization_id = ANY(public.get_user_organization_ids()));

-- API logs (org-level, admin only)
CREATE POLICY "Admins can view API logs"
  ON public."ApiLog"
  FOR SELECT
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );

-- Social accounts
CREATE POLICY "Users can view social accounts"
  ON public."SocialAccount"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Admins can manage social accounts"
  ON public."SocialAccount"
  FOR ALL
  USING (
    location_id = ANY(public.get_accessible_location_ids())
    AND public.has_role('GROUP_ADMIN')
  );

CREATE POLICY "Users can view social metrics"
  ON public."SocialMetrics"
  FOR SELECT
  USING (
    social_account_id IN (
      SELECT id FROM public."SocialAccount"
      WHERE location_id = ANY(public.get_accessible_location_ids())
    )
  );

CREATE POLICY "Users can view social posts"
  ON public."SocialPost"
  FOR SELECT
  USING (
    social_account_id IN (
      SELECT id FROM public."SocialAccount"
      WHERE location_id = ANY(public.get_accessible_location_ids())
    )
  );

-- AI Features
CREATE POLICY "Users can view AI prompts in their org"
  ON public."AIPrompt"
  FOR SELECT
  USING (organization_id = ANY(public.get_user_organization_ids()));

CREATE POLICY "Admins can manage AI prompts"
  ON public."AIPrompt"
  FOR ALL
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('PARTNER_ADMIN')
  );

CREATE POLICY "Users can view AI insights"
  ON public."AIInsight"
  FOR SELECT
  USING (location_id = ANY(public.get_accessible_location_ids()));

CREATE POLICY "Users can view AI usage in their org"
  ON public."AIUsage"
  FOR SELECT
  USING (
    organization_id = ANY(public.get_user_organization_ids())
    AND public.has_role('GROUP_ADMIN')
  );


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
