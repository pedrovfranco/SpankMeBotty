import { RateLimiter } from 'limiter';

const limiters: { [key: string]: RateLimiter } = {};
const RATE_LIMIT_AMOUNT = 5;
const RATE_LIMIT_INTERVAL = 10000;


export function take(key: string): boolean {
    let limiter = limiters[key];
    if (!limiter) {
        limiter = new RateLimiter({
            tokensPerInterval: RATE_LIMIT_AMOUNT,
            interval: RATE_LIMIT_INTERVAL,
        });
        limiters[key] = limiter;
    }
    if (limiter.getTokensRemaining() < 1) {
        return true;
    }
    limiter.removeTokens(1);
    return false;
}