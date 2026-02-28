/**
 * Restaurant Descriptors Configuration
 *
 * Defines descriptor options for each restaurant type.
 * Descriptors are used to build AI context for personalized insights.
 */

export interface Descriptor {
  id: string;
  label: string;
  context: string;
}

export interface DescriptorCategory {
  id: string;
  label: string;
  descriptors: Descriptor[];
}

export interface RestaurantDescriptors {
  [restaurantType: string]: DescriptorCategory[];
}

export const descriptorsByType: RestaurantDescriptors = {
  // ============================================================
  // FINE DINING
  // ============================================================
  fine_dining: [
    {
      id: "dining_experience",
      label: "Dining Experience",
      descriptors: [
        {
          id: "tasting_menu",
          label: "Tasting menu focused",
          context: "Tasting menu is the primary offering — multi-course experiences drive revenue and reputation",
        },
        {
          id: "a_la_carte",
          label: "À la carte focused",
          context: "À la carte menu with flexibility — guests choose individual dishes rather than set menus",
        },
        {
          id: "chef_driven",
          label: "Chef-driven concept",
          context: "Chef-driven restaurant where culinary creativity and reputation are central to the brand",
        },
        {
          id: "white_tablecloth",
          label: "Traditional white tablecloth",
          context: "Classic white tablecloth service — formal dining with high service standards",
        },
        {
          id: "modern_fine",
          label: "Modern/contemporary fine dining",
          context: "Modern fine dining approach — elevated food and service in a less formal setting",
        },
      ],
    },
    {
      id: "beverage_program",
      label: "Beverage & Wine Program",
      descriptors: [
        {
          id: "sommelier",
          label: "Active sommelier program",
          context: "Active sommelier program — wine expertise is part of the experience",
        },
        {
          id: "wine_forward",
          label: "Wine-forward concept",
          context: "Wine-forward concept — wine is a major revenue driver with deep cellar",
        },
        {
          id: "cocktail_program",
          label: "Craft cocktail program",
          context: "Serious craft cocktail program with dedicated bartenders",
        },
        {
          id: "beverage_pairings",
          label: "Beverage pairings offered",
          context: "Beverage pairing options — wine or cocktail pairings enhance the tasting menu experience",
        },
        {
          id: "rare_wines",
          label: "Rare/collectible wines",
          context: "Features rare and collectible wines — high-end wine collectors are part of the clientele",
        },
      ],
    },
    {
      id: "clientele",
      label: "Location & Clientele",
      descriptors: [
        {
          id: "special_occasion",
          label: "Special occasion destination",
          context: "Special occasion destination — anniversaries, birthdays, and celebrations drive bookings",
        },
        {
          id: "business_dining",
          label: "Business dining focus",
          context: "Popular for business dining and client entertainment — corporate accounts matter",
        },
        {
          id: "hotel_restaurant",
          label: "Hotel restaurant",
          context: "Hotel restaurant — serves hotel guests and destination diners",
        },
        {
          id: "standalone_destination",
          label: "Standalone destination",
          context: "Standalone destination restaurant — people travel specifically to dine here",
        },
        {
          id: "urban_affluent",
          label: "Urban affluent neighborhood",
          context: "Located in affluent urban area with high-income residents and professionals",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "dinner_only",
          label: "Dinner service only",
          context: "Dinner-only service — focused execution on single service",
        },
        {
          id: "lunch_dinner",
          label: "Lunch and dinner service",
          context: "Serves both lunch and dinner — different menus and price points by daypart",
        },
        {
          id: "private_dining",
          label: "Private dining rooms",
          context: "Has private dining rooms — events and private parties are a revenue stream",
        },
        {
          id: "reservation_required",
          label: "Reservations required",
          context: "Reservation-only model — demand exceeds capacity, managing wait lists",
        },
        {
          id: "seasonal_menu",
          label: "Seasonal menu changes",
          context: "Menu changes seasonally — ingredient sourcing and menu development are ongoing",
        },
      ],
    },
    {
      id: "growth_strategy",
      label: "Growth & Strategy",
      descriptors: [
        {
          id: "michelin_aspiration",
          label: "Michelin star aspiration",
          context: "Pursuing Michelin recognition — quality and consistency are paramount",
        },
        {
          id: "established_reputation",
          label: "Established reputation",
          context: "Established fine dining with loyal following — focus on maintaining excellence",
        },
        {
          id: "expanding_events",
          label: "Growing events business",
          context: "Growing private events and catering — looking to increase non-dining revenue",
        },
        {
          id: "media_presence",
          label: "Media/press focused",
          context: "Active media presence — press coverage and awards matter for marketing",
        },
      ],
    },
  ],

  // ============================================================
  // CASUAL DINING
  // ============================================================
  casual_dining: [
    {
      id: "dining_experience",
      label: "Dining Experience",
      descriptors: [
        {
          id: "family_friendly",
          label: "Family-friendly atmosphere",
          context: "Family-friendly restaurant — kids menu and accommodating service are important",
        },
        {
          id: "date_night",
          label: "Date night destination",
          context: "Popular for date nights — atmosphere and experience matter as much as food",
        },
        {
          id: "group_dining",
          label: "Groups and gatherings",
          context: "Accommodates groups and gatherings — parties and celebrations are common",
        },
        {
          id: "neighborhood_spot",
          label: "Neighborhood regular spot",
          context: "Neighborhood regular spot — repeat customers and locals are the core business",
        },
        {
          id: "trendy_vibe",
          label: "Trendy/hip atmosphere",
          context: "Trendy atmosphere attracting younger demographics seeking Instagram-worthy experiences",
        },
      ],
    },
    {
      id: "beverage_program",
      label: "Beverage & Bar Program",
      descriptors: [
        {
          id: "full_bar",
          label: "Full bar with cocktails",
          context: "Full bar with cocktail menu — beverage sales are significant revenue",
        },
        {
          id: "beer_wine_only",
          label: "Beer and wine only",
          context: "Beer and wine only — simpler beverage program focused on food",
        },
        {
          id: "happy_hour",
          label: "Strong happy hour program",
          context: "Active happy hour program — drives early evening traffic and bar revenue",
        },
        {
          id: "craft_beer",
          label: "Craft beer focus",
          context: "Craft beer focused — beer selection is a draw for guests",
        },
        {
          id: "margaritas_specialty",
          label: "Signature cocktails/margaritas",
          context: "Known for signature cocktails or margaritas — beverage is part of the brand",
        },
      ],
    },
    {
      id: "clientele",
      label: "Location & Clientele",
      descriptors: [
        {
          id: "suburban_location",
          label: "Suburban location",
          context: "Suburban location — car-dependent, parking matters, families dominate",
        },
        {
          id: "urban_location",
          label: "Urban/downtown location",
          context: "Urban location with foot traffic and mixed clientele",
        },
        {
          id: "shopping_area",
          label: "Shopping center/mall adjacent",
          context: "Near shopping — benefits from retail traffic and convenience dining",
        },
        {
          id: "sports_crowd",
          label: "Sports fans/game day crowd",
          context: "Attracts sports fans — game days and watch parties drive traffic",
        },
        {
          id: "after_work",
          label: "After-work crowd",
          context: "Popular after-work destination — happy hour and weeknight dining strong",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "lunch_dinner_weekend",
          label: "Lunch, dinner, weekend brunch",
          context: "Full-service lunch, dinner, and weekend brunch — multiple dayparts to optimize",
        },
        {
          id: "takeout_delivery",
          label: "Significant takeout/delivery",
          context: "Takeout and delivery are significant — off-premise sales matter",
        },
        {
          id: "large_patio",
          label: "Large patio/outdoor seating",
          context: "Significant patio seating — weather impacts capacity and revenue",
        },
        {
          id: "late_night",
          label: "Late night hours",
          context: "Open late — captures late-night dining and bar crowd",
        },
        {
          id: "catering_available",
          label: "Catering services",
          context: "Offers catering — corporate and event catering is a revenue stream",
        },
      ],
    },
    {
      id: "growth_strategy",
      label: "Growth & Strategy",
      descriptors: [
        {
          id: "loyalty_program",
          label: "Loyalty program active",
          context: "Active loyalty/rewards program — driving repeat visits through incentives",
        },
        {
          id: "expanding_locations",
          label: "Planning expansion",
          context: "Planning to open additional locations — growth and scalability are priorities",
        },
        {
          id: "menu_innovation",
          label: "Regular menu innovation",
          context: "Regularly updates menu with LTOs and seasonal items to drive traffic",
        },
        {
          id: "digital_focus",
          label: "Digital/online ordering focus",
          context: "Investing in digital ordering and online presence for convenience",
        },
      ],
    },
  ],

  // ============================================================
  // BAR / PUB
  // ============================================================
  bar_pub: [
    {
      id: "concept",
      label: "Bar Concept",
      descriptors: [
        {
          id: "sports_bar",
          label: "Sports bar",
          context: "Sports bar concept — TVs, game days, and sports programming drive traffic",
        },
        {
          id: "craft_cocktail_bar",
          label: "Craft cocktail bar",
          context: "Craft cocktail focused — mixology and drink quality are the draw",
        },
        {
          id: "dive_bar",
          label: "Dive bar / neighborhood pub",
          context: "Neighborhood dive/pub — unpretentious, locals-focused, value-oriented",
        },
        {
          id: "beer_bar",
          label: "Beer-focused (craft/tap room)",
          context: "Beer-focused establishment — extensive tap list and beer knowledge expected",
        },
        {
          id: "wine_bar",
          label: "Wine bar",
          context: "Wine bar concept — by-the-glass program and wine education are key",
        },
        {
          id: "nightclub_lounge",
          label: "Nightclub/lounge",
          context: "Nightclub or lounge — late-night focus, music/DJ, bottle service potential",
        },
      ],
    },
    {
      id: "food_program",
      label: "Food Program",
      descriptors: [
        {
          id: "full_kitchen",
          label: "Full kitchen/restaurant quality",
          context: "Full kitchen with restaurant-quality food — food is a real draw, not afterthought",
        },
        {
          id: "elevated_bar_food",
          label: "Elevated bar food",
          context: "Elevated bar food — upscale takes on classics, food drives some traffic",
        },
        {
          id: "basic_bar_snacks",
          label: "Basic bar snacks only",
          context: "Minimal food program — focus is on drinks, food is secondary",
        },
        {
          id: "late_night_menu",
          label: "Late night food menu",
          context: "Late-night food menu — captures hungry bar-goers after kitchen closes elsewhere",
        },
      ],
    },
    {
      id: "clientele",
      label: "Clientele & Vibe",
      descriptors: [
        {
          id: "young_professionals",
          label: "Young professionals",
          context: "Young professional clientele — after-work crowd, dating scene",
        },
        {
          id: "college_crowd",
          label: "College crowd",
          context: "College-age clientele — price-sensitive, high volume, weekends heavy",
        },
        {
          id: "mature_crowd",
          label: "Mature/older crowd",
          context: "Mature clientele — quieter atmosphere, regulars-focused",
        },
        {
          id: "industry_crowd",
          label: "Industry/service workers",
          context: "Popular with service industry workers — late night, industry nights",
        },
        {
          id: "lgbtq_friendly",
          label: "LGBTQ+ friendly/focused",
          context: "LGBTQ+ friendly or focused establishment — community gathering space",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations & Events",
      descriptors: [
        {
          id: "live_music",
          label: "Live music/entertainment",
          context: "Live music or entertainment — events and programming drive traffic",
        },
        {
          id: "trivia_games",
          label: "Trivia nights/games",
          context: "Regular trivia and game nights — programming brings in midweek crowds",
        },
        {
          id: "karaoke",
          label: "Karaoke",
          context: "Karaoke nights — interactive entertainment brings dedicated crowd",
        },
        {
          id: "private_events",
          label: "Private event space",
          context: "Has private event space — parties and buyouts are revenue stream",
        },
        {
          id: "outdoor_space",
          label: "Patio/rooftop/outdoor",
          context: "Outdoor space (patio/rooftop) — seasonal capacity and weather impact",
        },
      ],
    },
    {
      id: "growth_strategy",
      label: "Growth & Strategy",
      descriptors: [
        {
          id: "build_regulars",
          label: "Building regular clientele",
          context: "Focused on building regular clientele and neighborhood loyalty",
        },
        {
          id: "event_programming",
          label: "Expanding event programming",
          context: "Growing event programming — more themed nights and special events",
        },
        {
          id: "food_expansion",
          label: "Growing food program",
          context: "Expanding food program — want to increase food revenue percentage",
        },
        {
          id: "social_media",
          label: "Social media marketing focus",
          context: "Investing in social media presence to attract younger demographics",
        },
      ],
    },
  ],

  // ============================================================
  // FAST CASUAL
  // ============================================================
  fast_casual: [
    {
      id: "concept",
      label: "Concept & Format",
      descriptors: [
        {
          id: "build_your_own",
          label: "Build-your-own format",
          context: "Build-your-own/customizable format — assembly line or customization is key to model",
        },
        {
          id: "set_menu",
          label: "Set menu items",
          context: "Set menu with defined items — less customization, more brand consistency",
        },
        {
          id: "health_focused",
          label: "Health/wellness focused",
          context: "Health and wellness focused — clean ingredients, dietary accommodations matter",
        },
        {
          id: "indulgent",
          label: "Indulgent/comfort food",
          context: "Indulgent comfort food — craveable, not health-focused",
        },
        {
          id: "ethnic_concept",
          label: "Ethnic/international cuisine",
          context: "Ethnic or international cuisine concept — authenticity and flavor are the draw",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "counter_order",
          label: "Counter ordering",
          context: "Counter-order model — speed and efficiency critical",
        },
        {
          id: "digital_ordering",
          label: "Heavy digital/app ordering",
          context: "Significant digital ordering through app and kiosks — tech-forward operation",
        },
        {
          id: "drive_thru",
          label: "Drive-thru",
          context: "Has drive-thru — convenience and speed for car traffic",
        },
        {
          id: "delivery_focused",
          label: "Delivery-focused",
          context: "Significant delivery business — third-party and direct delivery important",
        },
        {
          id: "catering",
          label: "Corporate catering",
          context: "Active corporate catering program — office orders are significant",
        },
      ],
    },
    {
      id: "clientele",
      label: "Location & Clientele",
      descriptors: [
        {
          id: "lunch_rush",
          label: "Heavy lunch daypart",
          context: "Lunch is the primary daypart — office workers and midday rush dominate",
        },
        {
          id: "office_area",
          label: "Office/business district",
          context: "Located in office/business area — weekday lunch heavy, weekends slow",
        },
        {
          id: "shopping_center",
          label: "Shopping center location",
          context: "Shopping center location — benefits from retail traffic patterns",
        },
        {
          id: "college_adjacent",
          label: "Near college/university",
          context: "Near college campus — student traffic and price sensitivity",
        },
        {
          id: "suburban_families",
          label: "Suburban families",
          context: "Suburban location serving families — dinner and weekend traffic",
        },
      ],
    },
    {
      id: "growth_strategy",
      label: "Growth & Strategy",
      descriptors: [
        {
          id: "multi_unit",
          label: "Multi-unit operator",
          context: "Multi-unit operation — consistency and scalability are priorities",
        },
        {
          id: "single_location",
          label: "Single location focused",
          context: "Single location focused on perfecting operations before expansion",
        },
        {
          id: "loyalty_app",
          label: "Loyalty app program",
          context: "Active loyalty/rewards app — driving repeat visits and data collection",
        },
        {
          id: "lto_focus",
          label: "Regular LTOs",
          context: "Regular limited-time offers — menu innovation drives traffic",
        },
      ],
    },
  ],

  // ============================================================
  // QUICK SERVICE (QSR)
  // ============================================================
  quick_service: [
    {
      id: "format",
      label: "Format & Service",
      descriptors: [
        {
          id: "drive_thru_primary",
          label: "Drive-thru primary",
          context: "Drive-thru is primary revenue driver — speed of service critical",
        },
        {
          id: "walk_up",
          label: "Walk-up/counter only",
          context: "Walk-up or counter service only — foot traffic location dependent",
        },
        {
          id: "franchise",
          label: "Franchise operation",
          context: "Franchise operation — brand standards and franchise requirements apply",
        },
        {
          id: "independent",
          label: "Independent QSR",
          context: "Independent quick service — local brand, flexible operations",
        },
      ],
    },
    {
      id: "dayparts",
      label: "Daypart Focus",
      descriptors: [
        {
          id: "breakfast_focus",
          label: "Strong breakfast daypart",
          context: "Breakfast is significant daypart — morning rush optimization matters",
        },
        {
          id: "lunch_focus",
          label: "Lunch-heavy",
          context: "Lunch is the dominant daypart — midday rush is critical",
        },
        {
          id: "late_night",
          label: "Late night/24-hour",
          context: "Open late or 24 hours — late-night crowd is important",
        },
        {
          id: "all_day",
          label: "Balanced dayparts",
          context: "Balanced traffic across all dayparts — no single peak dominates",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "mobile_ordering",
          label: "Mobile ordering enabled",
          context: "Mobile ordering is significant — app and digital integration priority",
        },
        {
          id: "delivery_platforms",
          label: "Heavy third-party delivery",
          context: "Significant third-party delivery — platform relationships and fees matter",
        },
        {
          id: "kiosk_ordering",
          label: "Self-service kiosks",
          context: "Self-service kiosks in use — labor optimization through technology",
        },
        {
          id: "value_menu",
          label: "Value menu focus",
          context: "Value menu is important to traffic — price-sensitive customer base",
        },
      ],
    },
    {
      id: "growth_strategy",
      label: "Growth & Strategy",
      descriptors: [
        {
          id: "throughput",
          label: "Focused on throughput",
          context: "Primary focus on speed and throughput — efficiency is everything",
        },
        {
          id: "ticket_growth",
          label: "Growing average ticket",
          context: "Looking to increase average ticket through upselling and combos",
        },
        {
          id: "digital_growth",
          label: "Digital channel growth",
          context: "Growing digital channels — app downloads and online ordering priority",
        },
      ],
    },
  ],

  // ============================================================
  // CAFÉ
  // ============================================================
  cafe: [
    {
      id: "concept",
      label: "Café Concept",
      descriptors: [
        {
          id: "specialty_coffee",
          label: "Specialty coffee focused",
          context: "Specialty coffee focused — coffee quality and sourcing are differentiators",
        },
        {
          id: "coffee_and_food",
          label: "Coffee and food balanced",
          context: "Balanced coffee and food program — both contribute to revenue equally",
        },
        {
          id: "bakery_cafe",
          label: "Bakery café",
          context: "Bakery café — fresh-baked goods are a primary draw",
        },
        {
          id: "brunch_focused",
          label: "Brunch/breakfast focused",
          context: "Brunch and breakfast focused — morning and weekend brunch are peaks",
        },
      ],
    },
    {
      id: "beverage",
      label: "Beverage Program",
      descriptors: [
        {
          id: "espresso_focused",
          label: "Espresso drink focused",
          context: "Espresso drinks dominate — lattes, cappuccinos drive revenue",
        },
        {
          id: "drip_focused",
          label: "Drip/batch coffee focused",
          context: "Drip coffee focused — efficiency and volume over craft drinks",
        },
        {
          id: "tea_program",
          label: "Serious tea program",
          context: "Serious tea program — tea selection and preparation is a draw",
        },
        {
          id: "beer_wine",
          label: "Beer and wine available",
          context: "Serves beer and wine — afternoon and evening revenue opportunity",
        },
      ],
    },
    {
      id: "clientele",
      label: "Clientele & Use",
      descriptors: [
        {
          id: "remote_workers",
          label: "Remote workers/laptops",
          context: "Popular with remote workers — WiFi and seating time are considerations",
        },
        {
          id: "quick_stop",
          label: "Quick stop/grab-and-go",
          context: "Quick stop/grab-and-go focused — speed and convenience matter",
        },
        {
          id: "meeting_spot",
          label: "Meeting spot",
          context: "Used for meetings and conversations — ambiance and seating matter",
        },
        {
          id: "neighborhood_gathering",
          label: "Neighborhood gathering spot",
          context: "Neighborhood gathering spot — community and regulars are core",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "morning_peak",
          label: "Morning rush critical",
          context: "Morning rush is critical — 7-9am efficiency determines success",
        },
        {
          id: "all_day",
          label: "Steady all-day traffic",
          context: "Steady all-day traffic — no single rush, consistent flow",
        },
        {
          id: "retail_sales",
          label: "Retail bean/merchandise sales",
          context: "Retail coffee beans and merchandise sales supplement revenue",
        },
        {
          id: "catering",
          label: "Office/event catering",
          context: "Catering for offices and events — coffee service and pastry trays",
        },
      ],
    },
  ],

  // ============================================================
  // BISTRO
  // ============================================================
  bistro: [
    {
      id: "concept",
      label: "Bistro Concept",
      descriptors: [
        {
          id: "french_bistro",
          label: "Classic French bistro",
          context: "Classic French bistro — traditional preparations and Continental influence",
        },
        {
          id: "american_bistro",
          label: "American bistro",
          context: "American bistro — seasonal American cuisine with European techniques",
        },
        {
          id: "wine_bistro",
          label: "Wine-focused bistro",
          context: "Wine-focused bistro — wine program is equal to food in importance",
        },
        {
          id: "neighborhood_bistro",
          label: "Neighborhood bistro",
          context: "True neighborhood bistro — regulars, familiar service, local focus",
        },
      ],
    },
    {
      id: "beverage",
      label: "Wine & Beverage",
      descriptors: [
        {
          id: "french_wines",
          label: "French wine focused",
          context: "French wine focused list — Old World selections dominate",
        },
        {
          id: "eclectic_wines",
          label: "Eclectic wine list",
          context: "Eclectic wine list — variety of regions and styles",
        },
        {
          id: "by_the_glass",
          label: "Strong by-the-glass program",
          context: "Strong by-the-glass program — accessibility over cellar depth",
        },
        {
          id: "cocktails_too",
          label: "Cocktails alongside wine",
          context: "Full cocktail program alongside wine — not wine-exclusive",
        },
      ],
    },
    {
      id: "clientele",
      label: "Clientele",
      descriptors: [
        {
          id: "date_night",
          label: "Date night spot",
          context: "Popular for date nights — romantic atmosphere, couples dominate",
        },
        {
          id: "regulars_focused",
          label: "Regulars and locals",
          context: "Regulars and locals are core business — staff knows guests by name",
        },
        {
          id: "foodies",
          label: "Food-savvy clientele",
          context: "Food-savvy clientele who appreciate quality and technique",
        },
        {
          id: "walkable",
          label: "Walkable neighborhood",
          context: "Located in walkable neighborhood with foot traffic",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "dinner_focused",
          label: "Dinner focused",
          context: "Dinner-focused with occasional lunch — single service mentality",
        },
        {
          id: "brunch_dinner",
          label: "Weekend brunch + dinner",
          context: "Weekend brunch is significant alongside dinner service",
        },
        {
          id: "small_plates",
          label: "Small plates/sharing style",
          context: "Small plates and sharing style — multiple items per guest",
        },
        {
          id: "prix_fixe",
          label: "Prix fixe offerings",
          context: "Prix fixe menu offered — value perception and streamlined execution",
        },
      ],
    },
  ],

  // ============================================================
  // ETHNIC / SPECIALTY
  // ============================================================
  ethnic_specialty: [
    {
      id: "cuisine",
      label: "Cuisine Type",
      descriptors: [
        {
          id: "authentic_traditional",
          label: "Authentic/traditional",
          context: "Authentic traditional cuisine — cultural accuracy is priority",
        },
        {
          id: "fusion_modern",
          label: "Fusion/modern interpretation",
          context: "Fusion or modern interpretation — creative takes on traditional cuisine",
        },
        {
          id: "regional_specific",
          label: "Regional specialty",
          context: "Regional specialty cuisine — specific region rather than broad category",
        },
        {
          id: "family_recipes",
          label: "Family recipes",
          context: "Family recipes and heritage — personal story is part of brand",
        },
      ],
    },
    {
      id: "dining_style",
      label: "Dining Style",
      descriptors: [
        {
          id: "family_style",
          label: "Family-style service",
          context: "Family-style shared plates — communal dining encouraged",
        },
        {
          id: "individual_plates",
          label: "Individual portions",
          context: "Individual plated dishes — traditional restaurant service",
        },
        {
          id: "counter_casual",
          label: "Casual counter service",
          context: "Casual counter service — accessible and approachable",
        },
        {
          id: "upscale_ethnic",
          label: "Upscale presentation",
          context: "Elevated ethnic cuisine — higher price point, refined presentation",
        },
      ],
    },
    {
      id: "clientele",
      label: "Clientele",
      descriptors: [
        {
          id: "cultural_community",
          label: "Cultural community base",
          context: "Strong cultural community customer base — diaspora clientele",
        },
        {
          id: "adventurous_diners",
          label: "Adventurous diners",
          context: "Attracts adventurous diners seeking new cuisines",
        },
        {
          id: "mixed_clientele",
          label: "Mixed/diverse clientele",
          context: "Mixed clientele — both community members and newcomers to cuisine",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "takeout_heavy",
          label: "Heavy takeout/delivery",
          context: "Takeout and delivery significant — off-premise revenue matters",
        },
        {
          id: "dine_in_focused",
          label: "Dine-in focused",
          context: "Dine-in experience focused — ambiance and service matter",
        },
        {
          id: "cultural_events",
          label: "Cultural events/holidays",
          context: "Cultural holidays and events drive special business",
        },
        {
          id: "catering_cultural",
          label: "Cultural event catering",
          context: "Catering for cultural events, weddings, celebrations",
        },
      ],
    },
  ],

  // ============================================================
  // FOOD TRUCK
  // ============================================================
  food_truck: [
    {
      id: "concept",
      label: "Concept & Cuisine",
      descriptors: [
        {
          id: "single_concept",
          label: "Single focused concept",
          context: "Single focused menu concept — specialization is the brand",
        },
        {
          id: "varied_menu",
          label: "Varied menu",
          context: "Broader menu variety — appeals to wider audience",
        },
        {
          id: "gourmet_elevated",
          label: "Gourmet/elevated",
          context: "Gourmet food truck — elevated food, higher price point",
        },
        {
          id: "value_focused",
          label: "Value/volume focused",
          context: "Value-focused volume — affordable, quick, high turnover",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations & Locations",
      descriptors: [
        {
          id: "lunch_office",
          label: "Office park lunch service",
          context: "Office park lunch circuit — predictable weekday locations",
        },
        {
          id: "events_focused",
          label: "Events and festivals",
          context: "Events and festivals focused — special event bookings are primary",
        },
        {
          id: "brewery_winery",
          label: "Brewery/winery partnerships",
          context: "Partners with breweries/wineries — regular hosted locations",
        },
        {
          id: "fixed_location",
          label: "Semi-fixed location",
          context: "Semi-fixed location or pod — regular spot reduces logistics",
        },
        {
          id: "catering",
          label: "Private catering",
          context: "Private event catering — weddings and parties are revenue stream",
        },
      ],
    },
    {
      id: "clientele",
      label: "Clientele",
      descriptors: [
        {
          id: "office_workers",
          label: "Office workers",
          context: "Office workers on lunch break — speed and consistency matter",
        },
        {
          id: "food_truck_followers",
          label: "Food truck enthusiasts",
          context: "Food truck followers who track locations via social",
        },
        {
          id: "event_goers",
          label: "Event attendees",
          context: "Event attendees — captive audience at festivals/events",
        },
      ],
    },
    {
      id: "growth_strategy",
      label: "Growth & Marketing",
      descriptors: [
        {
          id: "social_media",
          label: "Social media driven",
          context: "Social media is primary marketing — location updates and engagement",
        },
        {
          id: "brick_mortar_goal",
          label: "Brick & mortar goal",
          context: "Goal to open brick and mortar location eventually",
        },
        {
          id: "fleet_expansion",
          label: "Fleet expansion planned",
          context: "Planning to add additional trucks for expanded coverage",
        },
      ],
    },
  ],

  // ============================================================
  // BUFFET
  // ============================================================
  buffet: [
    {
      id: "concept",
      label: "Buffet Concept",
      descriptors: [
        {
          id: "all_you_can_eat",
          label: "All-you-can-eat model",
          context: "All-you-can-eat model — fixed price, volume management critical",
        },
        {
          id: "pay_by_weight",
          label: "Pay by weight/plate",
          context: "Pay by weight or plate — customers self-regulate portions",
        },
        {
          id: "cuisine_specific",
          label: "Cuisine-specific buffet",
          context: "Cuisine-specific buffet (Chinese, Indian, etc.) — specialty expectations",
        },
        {
          id: "variety_buffet",
          label: "Multi-cuisine variety",
          context: "Multi-cuisine variety buffet — broad appeal, something for everyone",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "breakfast_buffet",
          label: "Breakfast buffet service",
          context: "Breakfast buffet is major daypart — morning setup and turnover",
        },
        {
          id: "lunch_buffet",
          label: "Lunch buffet focus",
          context: "Lunch buffet is primary — office workers and quick turnaround",
        },
        {
          id: "dinner_weekend",
          label: "Dinner and weekends strong",
          context: "Dinner and weekends are peaks — families and celebrations",
        },
        {
          id: "carving_stations",
          label: "Carving stations/action",
          context: "Action stations and carving — theater and perceived value",
        },
      ],
    },
    {
      id: "clientele",
      label: "Clientele",
      descriptors: [
        {
          id: "families",
          label: "Families with kids",
          context: "Families with kids are core — kids pricing and variety matter",
        },
        {
          id: "senior_groups",
          label: "Senior groups",
          context: "Seniors and tour groups — value-focused, group-friendly",
        },
        {
          id: "business_lunch",
          label: "Business lunch crowd",
          context: "Business lunch crowd — speed and predictability valued",
        },
      ],
    },
    {
      id: "strategy",
      label: "Strategy",
      descriptors: [
        {
          id: "waste_reduction",
          label: "Waste reduction focus",
          context: "Focused on waste reduction — food cost control is critical",
        },
        {
          id: "premium_items",
          label: "Premium items for perception",
          context: "Premium items (crab legs, prime rib) for value perception",
        },
        {
          id: "group_events",
          label: "Group events/parties",
          context: "Group events and parties — private room or buyouts",
        },
      ],
    },
  ],

  // ============================================================
  // FAMILY-STYLE
  // ============================================================
  family_style: [
    {
      id: "concept",
      label: "Restaurant Concept",
      descriptors: [
        {
          id: "chain_family",
          label: "Family restaurant chain",
          context: "Family restaurant chain — brand standards, consistency expected",
        },
        {
          id: "independent_family",
          label: "Independent family restaurant",
          context: "Independent family restaurant — local ownership, community ties",
        },
        {
          id: "diner_style",
          label: "Diner-style",
          context: "Diner-style family restaurant — breakfast all day, comfort food",
        },
        {
          id: "themed_family",
          label: "Themed family dining",
          context: "Themed family restaurant — entertainment or experience element",
        },
      ],
    },
    {
      id: "menu",
      label: "Menu & Food",
      descriptors: [
        {
          id: "kids_menu_important",
          label: "Kids menu is critical",
          context: "Kids menu is critical — kids eat free, kids' choices drive table selection",
        },
        {
          id: "comfort_classics",
          label: "Comfort food classics",
          context: "Comfort food classics — familiar favorites, broad appeal",
        },
        {
          id: "breakfast_all_day",
          label: "Breakfast served all day",
          context: "Breakfast served all day — pancakes and eggs are always available",
        },
        {
          id: "senior_menu",
          label: "Senior portions/pricing",
          context: "Senior menu or portions available — older demographic accommodated",
        },
      ],
    },
    {
      id: "clientele",
      label: "Clientele",
      descriptors: [
        {
          id: "after_church",
          label: "After church crowd",
          context: "Sunday after-church crowd is significant — family groups peak",
        },
        {
          id: "multi_generational",
          label: "Multi-generational groups",
          context: "Multi-generational family groups — grandparents to grandkids",
        },
        {
          id: "youth_sports",
          label: "Youth sports teams",
          context: "Youth sports teams and groups — post-game gatherings",
        },
        {
          id: "birthday_parties",
          label: "Birthday parties",
          context: "Birthday parties for kids — celebration destination",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "high_turnover",
          label: "High table turnover",
          context: "High turnover expected — efficiency and speed balance with hospitality",
        },
        {
          id: "early_bird",
          label: "Early bird specials",
          context: "Early bird specials active — attracts seniors, fills early slots",
        },
        {
          id: "takeout_significant",
          label: "Takeout/to-go significant",
          context: "Takeout and to-go meals significant — family meal deals",
        },
      ],
    },
  ],

  // ============================================================
  // GHOST KITCHEN / VIRTUAL
  // ============================================================
  ghost_kitchen: [
    {
      id: "model",
      label: "Business Model",
      descriptors: [
        {
          id: "single_brand",
          label: "Single brand operation",
          context: "Single brand ghost kitchen — focused concept and marketing",
        },
        {
          id: "multi_brand",
          label: "Multiple virtual brands",
          context: "Multiple virtual brands from same kitchen — brand portfolio strategy",
        },
        {
          id: "restaurant_extension",
          label: "Extension of brick & mortar",
          context: "Delivery extension of existing restaurant — same food, delivery-only location",
        },
        {
          id: "delivery_only_native",
          label: "Delivery-only native",
          context: "Born as delivery-only concept — no dine-in heritage",
        },
      ],
    },
    {
      id: "platforms",
      label: "Platforms & Channels",
      descriptors: [
        {
          id: "multi_platform",
          label: "Multi-platform presence",
          context: "Present on multiple delivery platforms — DoorDash, UberEats, Grubhub, etc.",
        },
        {
          id: "single_platform",
          label: "Primary platform focus",
          context: "Focused on single primary platform — optimizing for one ecosystem",
        },
        {
          id: "direct_ordering",
          label: "Direct ordering emphasis",
          context: "Building direct ordering channel — reducing platform commissions",
        },
        {
          id: "corporate_delivery",
          label: "Corporate delivery accounts",
          context: "Corporate delivery accounts — office catering and group orders",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      descriptors: [
        {
          id: "shared_kitchen",
          label: "Shared kitchen facility",
          context: "Operating from shared kitchen facility — multiple brands share space",
        },
        {
          id: "dedicated_kitchen",
          label: "Dedicated kitchen space",
          context: "Dedicated kitchen space — single operator facility",
        },
        {
          id: "peak_optimization",
          label: "Peak hours optimization",
          context: "Focused on peak delivery hours — lunch and dinner rushes",
        },
        {
          id: "extended_hours",
          label: "Extended/late night hours",
          context: "Extended hours including late night — capturing off-peak demand",
        },
      ],
    },
    {
      id: "strategy",
      label: "Growth Strategy",
      descriptors: [
        {
          id: "brand_building",
          label: "Brand awareness building",
          context: "Building brand awareness without storefront — marketing challenge",
        },
        {
          id: "expansion_territories",
          label: "Geographic expansion",
          context: "Expanding to new territories and delivery zones",
        },
        {
          id: "menu_optimization",
          label: "Delivery menu optimization",
          context: "Optimizing menu for delivery — packaging, travel, and quality focus",
        },
        {
          id: "brick_mortar_goal",
          label: "Future brick & mortar",
          context: "Planning future brick & mortar location based on delivery success",
        },
      ],
    },
  ],
};

/**
 * Get descriptors for a specific restaurant type
 */
export function getDescriptorsForType(
  restaurantType: string
): DescriptorCategory[] {
  return descriptorsByType[restaurantType] || [];
}

/**
 * Get a flat map of all descriptor IDs to their context strings for a given type
 */
export function getDescriptorContextMap(
  restaurantType: string
): Record<string, string> {
  const categories = getDescriptorsForType(restaurantType);
  const map: Record<string, string> = {};

  for (const category of categories) {
    for (const descriptor of category.descriptors) {
      map[descriptor.id] = descriptor.context;
    }
  }

  return map;
}

/**
 * Convert selected descriptor IDs to context strings
 */
export function descriptorIdsToContexts(
  restaurantType: string,
  descriptorIds: string[]
): string[] {
  const contextMap = getDescriptorContextMap(restaurantType);
  return descriptorIds
    .map((id) => contextMap[id])
    .filter((context): context is string => !!context);
}
