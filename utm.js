/**
 * UTM helper for links Lon Clinic actually sends (email, WhatsApp, social share).
 * Do not stamp these on internal nav — that overwrites paid last-touch.
 *
 * Campaign naming (utm_campaign):
 *   lowercase snake_case, optional month+year suffix: theme_channel_monyyyy
 *   examples: renewal_followup_sep2026, ig_bio_organic, invite_pay
 */
'use strict';

const { SITE_ORIGIN, originOf } = require('./seo');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function slugCampaign(raw) {
    return String(raw || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

function datedCampaign(base, date) {
    const d = date instanceof Date ? date : new Date();
    const slug = slugCampaign(base);
    if (!slug) return '';
    return `${slug}_${MONTHS[d.getUTCMonth()]}${d.getUTCFullYear()}`;
}

function withUtm(url, spec) {
    const s = spec || {};
    const abs = /^https?:\/\//i.test(String(url || ''));
    let u;
    try {
        u = new URL(String(url || ''), SITE_ORIGIN);
    } catch (e) {
        return String(url || '');
    }
    const host = u.hostname.toLowerCase();
    if (host === 'lonclinic.com' || host === 'www.lonclinic.com') {
        u.protocol = 'https:';
        u.hostname = 'www.lonclinic.com';
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
    ig: { source: 'instagram_bio', medium: 'social', campaign: 'ig_bio_organic', label: 'Instagram bio' },
    'ig-bio': { source: 'instagram_bio', medium: 'social', campaign: 'ig_bio_organic', label: 'Instagram bio' },
    'ig-story': { source: 'instagram', medium: 'social', campaign: 'ig_story_organic', label: 'Instagram story' },
    'ig-post': { source: 'instagram', medium: 'social', campaign: 'ig_post_organic', label: 'Instagram post / reel' },
    'ig-reel': { source: 'instagram', medium: 'social', campaign: 'ig_reel_organic', label: 'Instagram reel' },
    wa: { source: 'whatsapp', medium: 'social', campaign: 'wa_broadcast', label: 'WhatsApp broadcast' },
    'wa-status': { source: 'whatsapp', medium: 'social', campaign: 'wa_status', label: 'WhatsApp status' },
    'wa-chat': { source: 'whatsapp', medium: 'social', campaign: 'wa_direct_chat', label: 'WhatsApp direct chat' },
    fb: { source: 'facebook', medium: 'social', campaign: 'fb_organic', label: 'Facebook' },
    linkedin: { source: 'linkedin', medium: 'social', campaign: 'linkedin_organic', label: 'LinkedIn' },
    tiktok: { source: 'tiktok', medium: 'social', campaign: 'tiktok_organic', label: 'TikTok' },
    google: { source: 'google', medium: 'organic', campaign: 'google_gbp', label: 'Google Business Profile' },
    'email-sig': { source: 'email', medium: 'email', campaign: 'email_signature', label: 'Email signature' }
};

function safeInternalPath(raw) {
    const s = String(raw || '').trim();
    if (!s || s === '/') return '/';
    if (!s.startsWith('/') || s.startsWith('//') || s.includes('://') || s.includes('\\')) return '/';
    return s.slice(0, 240);
}

function trackedLinksForAdmin(origin) {
    const o = originOf(origin).replace(/\/$/, '');
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

module.exports = { withUtm, emailLink, socialLink, TRACKED_REDIRECTS, safeInternalPath, trackedLinksForAdmin, datedCampaign, slugCampaign };
