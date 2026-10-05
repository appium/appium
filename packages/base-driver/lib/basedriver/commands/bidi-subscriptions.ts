import {util} from '@appium/support';

type BidiSubscriptionDriver = {bidiEventSubs: Record<string, string[]>};

// subscription id -> event name -> contexts; kept per id so removing one keeps overlapping ones
type Subscriptions = Map<string, Map<string, string[]>>;

const subscriptionsByDriver = new WeakMap<object, Subscriptions>();

/** Get (or lazily create) the subscription registry of the given driver */
export function getSubscriptions(driver: object): Subscriptions {
  let subscriptions = subscriptionsByDriver.get(driver);
  if (!subscriptions) {
    subscriptions = new Map();
    subscriptionsByDriver.set(driver, subscriptions);
  }
  return subscriptions;
}

/** Recompute `bidiEventSubs` as the union of all registered subscriptions */
export function refreshEventSubscriptions(driver: BidiSubscriptionDriver): void {
  const events = new Map<string, string[]>();
  for (const subscription of getSubscriptions(driver).values()) {
    for (const [event, contexts] of subscription) {
      events.set(event, util.uniq([...(events.get(event) ?? []), ...contexts]));
    }
  }
  // Object.fromEntries defines own properties, so names like '__proto__' stay safe
  driver.bidiEventSubs = Object.fromEntries(events);
}

/** Forget all subscriptions, e.g. when the session ends */
export function clearBidiSubscriptions(driver: BidiSubscriptionDriver): void {
  subscriptionsByDriver.delete(driver);
  driver.bidiEventSubs = {};
}
