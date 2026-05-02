/** Defaults aligned with backend SiteSettingsPayload / Admin Visual Editor. */
export const SITE_SETTINGS_DEFAULTS = {
    theme: {
        primary_color: '#0051BA',
        accent_color: '#CCFF00',
        button_style: 'solid',
        corner_radius: 'medium',
    },
    home_content: {
        hero_title: 'Tennis Buddies Club',
        hero_subtitle: 'Your Sunday doubles tennis community.',
        hero_cta_label: 'Join the Club',
        hero_cta_url: '/register',
        support_text: 'Love Tennis Buddies Club?',
        support_button_label: 'Support This Site',
        support_button_url: 'https://venmo.com/u/Sergei-Nabatov',
    },
    layout_flags: {
        show_announcements: true,
        show_upcoming_matches: true,
        show_support_banner: true,
    },
};

export function mergeSitePayload(base, patch) {
    if (!patch) return base;
    return {
        theme: { ...base.theme, ...(patch.theme || {}) },
        home_content: { ...base.home_content, ...(patch.home_content || {}) },
        layout_flags: { ...base.layout_flags, ...(patch.layout_flags || {}) },
    };
}
