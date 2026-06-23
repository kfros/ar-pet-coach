import type { Session } from '../../types/Session';
import { NOISE_SUPPORT_PREMIUM_SESSIONS } from './noiseSupport';
import { HOME_VISITORS_PREMIUM_SESSIONS } from './homeVisitors';
import { ALONE_TIME_PREMIUM_SESSIONS } from './aloneTime';
import { CARE_HANDLING_PREMIUM_SESSIONS } from './careHandling';
import { WALK_FEAR_PREMIUM_SESSIONS } from './walkFear';

export const PREMIUM_SESSIONS: Session[] = [
    ...NOISE_SUPPORT_PREMIUM_SESSIONS,
    ...HOME_VISITORS_PREMIUM_SESSIONS,
    ...ALONE_TIME_PREMIUM_SESSIONS,
    ...CARE_HANDLING_PREMIUM_SESSIONS,
    ...WALK_FEAR_PREMIUM_SESSIONS
];
