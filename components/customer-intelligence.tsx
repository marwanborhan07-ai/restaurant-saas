"use client";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_orders: number | null;
  total_spent: number | null;
  last_order_at: string | null;
};

type Order = {
  id: string;
  order_number: string;
  total: number;
  currency_code: string | null;
  status: string;
  created_at: string;
};

type Props = {
  customer: Customer;
  orders: Order[];
};

function daysSince(date: string | null) {
  if (!date) return null;

  const time = new Date(date).getTime();

  if (Number.isNaN(time)) return null;

  return Math.max(
    0,
    Math.floor(
      (Date.now() - time) / (1000 * 60 * 60 * 24)
    )
  );
}

function getLifecycle(days: number | null, ordersCount: number) {
  if (ordersCount === 0) {
    return {
      label: "No Purchase",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (days === null || days <= 14) {
    return {
      label: "Active",
      className: "bg-green-100 text-green-700",
    };
  }

  if (days <= 30) {
    return {
      label: "Cooling",
      className: "bg-yellow-100 text-yellow-700",
    };
  }

  if (days <= 60) {
    return {
      label: "At Risk",
      className: "bg-orange-100 text-orange-700",
    };
  }

  return {
    label: "Lost",
    className: "bg-red-100 text-red-700",
  };
}

function getHealthScore(
  days: number | null,
  ordersCount: number,
  hasContact: boolean
) {
  let score = 0;

  // Recency: 0–50
  if (days === null) {
    score += 0;
  } else if (days <= 7) {
    score += 50;
  } else if (days <= 14) {
    score += 40;
  } else if (days <= 30) {
    score += 30;
  } else if (days <= 60) {
    score += 15;
  }

  // Frequency: 0–30
  if (ordersCount >= 10) {
    score += 30;
  } else if (ordersCount >= 5) {
    score += 25;
  } else if (ordersCount >= 3) {
    score += 20;
  } else if (ordersCount >= 2) {
    score += 12;
  } else if (ordersCount === 1) {
    score += 8;
  }

  // Reachability: 0–20
  if (hasContact) {
    score += 20;
  }

  return Math.min(100, score);
}

function getHealthTone(score: number) {
  if (score >= 80) {
    return {
      label: "Excellent",
      className: "text-green-600",
      barClass: "bg-green-500",
    };
  }

  if (score >= 60) {
    return {
      label: "Healthy",
      className: "text-blue-600",
      barClass: "bg-blue-500",
    };
  }

  if (score >= 40) {
    return {
      label: "Needs Attention",
      className: "text-yellow-600",
      barClass: "bg-yellow-500",
    };
  }

  return {
    label: "Critical",
    className: "text-red-600",
    barClass: "bg-red-500",
  };
}

function getNextAction(
  lifecycle: string,
  hasWhatsApp: boolean
) {
  if (lifecycle === "Lost") {
    return hasWhatsApp
      ? "Launch a WhatsApp win-back campaign."
      : "Add a phone number, then launch a win-back campaign.";
  }

  if (lifecycle === "At Risk") {
    return hasWhatsApp
      ? "Send a personalized comeback offer on WhatsApp."
      : "Reach out with a personalized comeback offer.";
  }

  if (lifecycle === "Cooling") {
    return "Send a reminder before this customer becomes at risk.";
  }

  if (lifecycle === "Active") {
    return "Keep engagement high and encourage the next purchase.";
  }

  return "Convert this customer from first purchase to repeat purchase.";
}

export default function CustomerIntelligence({
  customer,
  orders,
}: Props) {
  const orderedOrders = [...orders].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  const orderCount = orderedOrders.length;

  const lastOrderDate =
    orderedOrders[0]?.created_at ||
    customer.last_order_at ||
    null;

  const inactiveDays = daysSince(lastOrderDate);

  const lifecycle = getLifecycle(
    inactiveDays,
    orderCount
  );

  const healthScore = getHealthScore(
    inactiveDays,
    orderCount,
    Boolean(customer.phone || customer.email)
  );

  const healthTone = getHealthTone(healthScore);

  const revenueByCurrency: Record<string, number> = {};

  orderedOrders.forEach((order) => {
    const currency =
      order.currency_code || "EGP";

    revenueByCurrency[currency] =
      (revenueByCurrency[currency] || 0) +
      Number(order.total || 0);
  });

  const lastOrder =
    orderedOrders.length > 0
      ? orderedOrders[0]
      : null;

  const action = getNextAction(
    lifecycle.label,
    Boolean(customer.phone)
  );

  return (
    <div className="space-y-6">
      {/* Customer 360 */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Customer Intelligence
            </p>

            <h3 className="mt-1 text-xl font-bold text-gray-900">
              Customer 360
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              A complete growth view of this customer.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${lifecycle.className}`}
          >
            {lifecycle.label}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-gray-500">
              Health Score
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {healthScore}
              </span>

              <span
                className={`pb-1 text-xs font-semibold ${healthTone.className}`}
              >
                {healthTone.label}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full ${healthTone.barClass}`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-gray-500">
              Orders
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {orderCount}
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-gray-500">
              Last Order
            </p>

            <p className="mt-2 text-lg font-bold text-gray-900">
              {inactiveDays === null
                ? "Never"
                : inactiveDays === 0
                  ? "Today"
                  : `${inactiveDays} days ago`}
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-gray-500">
              Contactability
            </p>

            <p className="mt-2 text-lg font-bold text-gray-900">
              {customer.phone
                ? "WhatsApp ready"
                : customer.email
                  ? "Email ready"
                  : "No contact"}
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-gray-500">
              Next Action
            </p>

            <p className="mt-2 text-sm font-semibold leading-5 text-gray-900">
              {action}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue by Currency */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Customer Value
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Revenue is kept separate by currency.
          </p>

          <div className="mt-5 space-y-3">
            {Object.entries(revenueByCurrency).length === 0 ? (
              <p className="text-sm text-gray-500">
                No purchase data yet.
              </p>
            ) : (
              Object.entries(revenueByCurrency).map(
                ([currency, amount]) => (
                  <div
                    key={currency}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-gray-600">
                      {currency}
                    </span>

                    <span className="font-bold text-emerald-600">
                      {amount.toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Churn Detection
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Based on the customer's recent purchase behavior.
          </p>

          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Current lifecycle
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900">
                  {lifecycle.label}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${lifecycle.className}`}
              >
                {inactiveDays === null
                  ? "No activity"
                  : `${inactiveDays}d inactive`}
              </span>
            </div>

            <div className="mt-5 border-t pt-4">
              <p className="text-sm font-medium text-gray-500">
                Recommended action
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
                {action}
              </p>
            </div>

            {lastOrder && (
              <p className="mt-4 text-xs text-gray-500">
                Last order: {lastOrder.order_number} ·{" "}
                {new Date(
                  lastOrder.created_at
                ).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
