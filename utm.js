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

module.exports = { withUtm, emailLink, socialLink };
