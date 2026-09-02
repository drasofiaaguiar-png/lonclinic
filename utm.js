/**
 * UTM helper for links Lon Clinic actually sends (email, WhatsApp, social share).
 * Do not stamp these on internal nav — that overwrites paid last-touch.
 */
'use strict';

function withUtm(url, spec) {
    const s = spec || {};
    const abs = /^https?:\/\//i.test(String(url || ''));
    let u;
    try {
        u = new URL(String(url || ''), 'https://lonclinic.com');
    } catch (e) {
        return String(url || '');
    }
    const pairs = [
        ['utm_source', s.source],
        ['utm_medium', s.medium],
        ['utm_campaign', s.campaign],
        ['utm_content', s.content],
        ['utm_term', s.term]
    ];
    for (const [key, val] of pairs) {
        if (val) u.searchParams.set(key, String(val).slice(0, 120));
    }
    if (s.ref) u.searchParams.set('ref', String(s.ref).slice(0, 80));
    if (abs) return u.toString();
    return `${u.pathname}${u.search}${u.hash}`;
}

function emailLink(url, campaign, content) {
    return withUtm(url, {
        source: 'email',
        medium: 'email',
        campaign: campaign,
        content: content || 'body',
        ref: campaign
    });
}

function socialLink(url, network, campaign) {
    return withUtm(url, {
        source: String(network || 'share').toLowerCase(),
        medium: 'social',
        campaign: campaign || 'content-share',
        content: String(network || 'share').toLowerCase(),
        ref: campaign || 'content-share'
    });
}

const TRACKED_REDIRECTS = {
    ig: { source: 'instagram_bio', medium: 'social', campaign: 'bio', label: 'Instagram bio' },
    'ig-bio': { source: 'instagram_bio', medium: 'social', campaign: 'bio', label: 'Instagram bio' },
    'ig-story': { source: 'instagram', medium: 'social', campaign: 'story', label: 'Instagram story' },
    'ig-post': { source: 'instagram', medium: 'social', campaign: 'post', label: 'Instagram post / reel' },
    wa: { source: 'whatsapp', medium: 'social', campaign: 'broadcast', label: 'WhatsApp broadcast' },
    'wa-status': { source: 'whatsapp', medium: 'social', campaign: 'status', label: 'WhatsApp status' },
    fb: { source: 'facebook', medium: 'social', campaign: 'organic', label: 'Facebook' },
    linkedin: { source: 'linkedin', medium: 'social', campaign: 'organic', label: 'LinkedIn' }
};

function safeInternalPath(raw) {
    const s = String(raw || '').trim();
    if (!s || s === '/') return '/';
    if (!s.startsWith('/') || s.startsWith('//') || s.includes('://') || s.includes('\\')) return '/';
    return s.slice(0, 240);
}

function trackedLinksForAdmin(origin) {
    const o = String(origin || 'https://lonclinic.com').replace(/\/$/, '');
    const seen = new Set();
    return Object.entries(TRACKED_REDIRECTS)
        .filter(([, spec]) => {
            if (seen.has(spec.label)) return false;
            seen.add(spec.label);
            return true;
        })
        .map(([slug, spec]) => ({
            id: slug,
            label: spec.label,
            url: `${o}/r/${slug}`,
            utm: `utm_source=${spec.source}&utm_medium=${spec.medium}&utm_campaign=${spec.campaign}`
        }));
}

module.exports = { withUtm, emailLink, socialLink, TRACKED_REDIRECTS, safeInternalPath, trackedLinksForAdmin };
