// 'ua' is not a valid ISO 639-1 language code (it's the ISO 3166 country code
// for Ukraine). The canonical Ukrainian locale key is 'uk'. This alias is
// kept for back-compat with existing `registerLocale('ua', ...)` callers and
// re-exports the canonical 'uk' translation to prevent the two from
// diverging again. See DCMS-534.
export { default } from '../uk';
