export type PlanKey = "launch" | "growth" | "scale";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "expired"
  | "cancelled";

export type PlanConfig = {
  name: string;
  price: number;
  customerLimit: number;
  orderLimit: number;
  campaignLimit: number;
  whatsappLimit: number;
  automationLimit: number;
  userLimit: number;
  templateLimit: number | null;
  roiTracking: boolean;
  advancedAnalytics: boolean;
  growthRecommendations: boolean;
  multiLocation: boolean;
  apiAccess: boolean;
};

export const PLANS: Record<PlanKey, PlanConfig> = {
  launch: {
    name: "Launch",
    price: 1000,
    customerLimit: 1000,
    orderLimit: 5000,
    campaignLimit: 5,
    whatsappLimit: 1000,
    automationLimit: 2,
    userLimit: 2,
    templateLimit: 5,
    roiTracking: false,
    advancedAnalytics: false,
    growthRecommendations: false,
    multiLocation: false,
    apiAccess: false,
  },

  growth: {
    name: "Growth",
    price: 2000,
    customerLimit: 5000,
    orderLimit: 25000,
    campaignLimit: 20,
    whatsappLimit: 5000,
    automationLimit: 10,
    userLimit: 5,
    templateLimit: 20,
    roiTracking: true,
    advancedAnalytics: true,
    growthRecommendations: true,
    multiLocation: false,
    apiAccess: false,
  },

  scale: {
    name: "Scale",
    price: 3500,
    customerLimit: 20000,
    orderLimit: 100000,
    campaignLimit: 50,
    whatsappLimit: 15000,
    automationLimit: 20,
    userLimit: 15,
    templateLimit: null,
    roiTracking: true,
    advancedAnalytics: true,
    growthRecommendations: true,
    multiLocation: true,
    apiAccess: true,
  },
};

export const TRIAL = {
  days: 14,
  whatsappLimit: 200,
};

export function getPlan(plan: PlanKey) {
  return PLANS[plan];
}

export function getDaysRemaining(endsAt: string | null) {
  if (!endsAt) return 0;

  const remaining =
    new Date(endsAt).getTime() - Date.now();

  if (remaining <= 0) return 0;

  return Math.ceil(
    remaining / (1000 * 60 * 60 * 24)
  );
}

export function getHoursMinutesRemaining(
  endsAt: string | null
) {
  if (!endsAt) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      totalMs: 0,
    };
  }

  const totalMs = Math.max(
    0,
    new Date(endsAt).getTime() - Date.now()
  );

  const totalMinutes = Math.floor(
    totalMs / (1000 * 60)
  );

  const days = Math.floor(
    totalMinutes / (60 * 24)
  );

  const hours = Math.floor(
    (totalMinutes % (60 * 24)) / 60
  );

  const minutes = totalMinutes % 60;

  return {
    days,
    hours,
    minutes,
    totalMs,
  };
}

export function isSubscriptionActive(
  status: SubscriptionStatus,
  trialEndsAt: string | null,
  paidUntil: string | null
) {
  if (status === "active") {
    return (
      !paidUntil ||
      new Date(paidUntil).getTime() > Date.now()
    );
  }

  if (status === "trial") {
    return (
      !!trialEndsAt &&
      new Date(trialEndsAt).getTime() > Date.now()
    );
  }

  return false;
}
