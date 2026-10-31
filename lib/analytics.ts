export type AnalyticsProps = Record<string, string | number | boolean>;
/** No provider selected yet: callers remain independent from any analytics SDK. */
export function track(event: string, props: AnalyticsProps = {}) {
  void event;
  void props;
}
