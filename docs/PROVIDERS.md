# X Data Providers — Research & Verification

## Official X API v2

- **Endpoint**: `GET https://api.x.com/2/tweets/search/recent`
- **Auth**: `Authorization: Bearer <token>`
- **Query params**: `query` (required, ≤512 chars), `max_results` (10-100, default 10), `start_time`, `end_time`, `since_id`, `until_id`, `tweet.fields`, `user.fields`, `expansions` (need `author_id` to get user data in `includes.users`)
- **Counts endpoint**: `GET /2/tweets/counts/recent` with `query`, `start_time`, `end_time`, `granularity` (minute/hour/day)
- **Rate limits**: Depends on tier. Basic: 450 req/15min (search), 300 req/15min (counts)
- **Cost**: Pay-per-use. ~$0.005-0.010 per request (counts), ~$5/1k posts (search)
- **ToS**: Official API, requires developer account. Must comply with X Developer Agreement.
- **Pagination**: `next_token` in response meta
- **Note**: `max_results` min is 10, not 1. Our adapter clamps to [10, 100].

## TwitterAPI.io

- **Endpoint**: `GET https://api.twitterapi.io/twitter/tweet/advanced_search`
- **Auth**: `X-API-Key` header
- **Query params**: `query` (required), `queryType` ("Latest" or "Top", default "Latest"), `cursor` (pagination)
- **NO `count` param** — page size is ~20 tweets per page
- **Response**: `{ tweets: Tweet[], has_next_page: boolean, next_cursor: string }`
- **Tweet entities**: uses `hashtags` (with `text`), NOT `cashtags`. No `cashtags` field.
- **Rate limits**: Not explicitly documented. Pay per item returned.
- **Cost**: ~$0.15/1k posts
- **ToS**: Third-party. Pay per item. No explicit ToS beyond service agreement.
- **Pagination**: `cursor` param, stop when `has_next_page` is false or `next_cursor` is empty/same

## SocialData.tools

- **Endpoint**: `GET https://api.socialdata.tools/twitter/search`
- **Auth**: `Authorization: Bearer <key>`
- **Query params**: `query` (required), `type` ("Latest" or "Top", default "Latest"), `cursor` (pagination)
- **NO `count` param** — Twitter returns ~20 results per page
- **Response**: `{ tweets: Tweet[], next_cursor: string }`
- **Tweet fields**: `id_str`, `user` (with `id_str`, `screen_name`, `followers_count`), `full_text` or `text`, `created_at`, `favorite_count`, `retweet_count`, `reply_count`, `quote_count`, `retweeted_status`, `in_reply_to_status_id_str`, `entities` (with `urls`, `symbols` with `text`, `hashtags`, `user_mentions`)
- **Rate limits**: 120 requests/minute shared across all endpoints
- **Cost**: ~$0.20/1k posts (docs say ~$0.40 in some places, need to verify)
- **ToS**: Third-party. Pay per result. 120 req/min limit.
- **Pagination**: `cursor` param

## GetXAPI

- **Dashboard**: `https://www.getxapi.com/dashboard`
- **Pricing (web search summary 2026-11-13, [verify])**: Pay-per-call, no monthly subscription required. Standard read calls ~$0.001 per call (~20 tweets per page, ~$0.05/1k tweets). Free trial credit (~$0.10) reported.
- **Status**: Candidate third-party provider, not tested or wired.
- **ToS**: Third-party service (does not require an official X developer account). Note `docs/GUIDELINE.md` §4.1: Official X API is the only ToS-clean route; third-party providers carry scraping / supply risk.

## Bugs Found & Fixed

| Adapter | Bug | Fix |
|---|---|---|
| XOfficial | Missing `expansions=author_id` → `includes.users` empty → authorHandle/authorFollowers always empty/0 | Added `expansions: 'author_id'` |
| XOfficial | `max_results` not clamped to [10, 100] → API rejects values outside range | Clamped with `Math.min(Math.max(limit ?? 10, 10), 100)` |
| TwitterAPI.io | Used `count` param which doesn't exist → ignored by API | Replaced with `cursor` param for pagination |
| TwitterAPI.io | `mentionedCashtags` used `entities.cashtags` which doesn't exist → always empty | Changed to `entities.hashtags?.map(h => h.text)` |
| SocialData | Didn't pass `type` param (Latest/Top) | Added `type` param with default "Latest" |
| SocialData | Used `count` param which doesn't exist → ignored by API | Replaced with `cursor` param for pagination |

## ToS Compliance Notes

- **Official X API**: Requires developer account. Must comply with X Developer Agreement. Pay-per-use. No scraping.
- **TwitterAPI.io**: Third-party service. Pay per item. No explicit scraping restrictions beyond service ToS.
- **SocialData**: Third-party service. Pay per result. 120 req/min shared limit. No explicit scraping restrictions.

All three are API-based (not scraping). Compliant with X ToS as long as we use the APIs as intended (no bulk data resale, no spam, etc.).
