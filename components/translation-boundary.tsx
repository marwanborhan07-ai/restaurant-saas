"use client";

import React, {
  isValidElement,
  type ReactNode,
} from "react";
import { useLanguage } from "./language-context";

const dictionary: Record<string, string> = {
  // =========================
  // GLOBAL
  // =========================
  "Dashboard": "لوحة التحكم",
  "Customers": "العملاء",
  "Orders": "الطلبات",
  "Segments": "الشرائح",
  "Customer Segments": "شرائح العملاء",
  "Retention": "الاحتفاظ بالعملاء",
  "Customer Retention": "الاحتفاظ بالعملاء",
  "Campaigns": "الحملات",
  "Automation": "الأتمتة",
  "WhatsApp": "واتساب",
  "Settings": "الإعدادات",

  // =========================
  // DASHBOARD
  // =========================
  "Restaurant Overview": "نظرة عامة على المطعم",
  "Track your restaurant performance and customer growth.": "تابع أداء مطعمك ونمو قاعدة عملائك.",
  "Track your restaurant performance and customer growth": "تابع أداء مطعمك ونمو قاعدة عملائك",
  "Total Revenue": "إجمالي الإيرادات",
  "Total Orders": "إجمالي الطلبات",
  "Total Customers": "إجمالي العملاء",
  "VIP Customers": "عملاء VIP",
  "Recent Orders": "أحدث الطلبات",
  "Your latest restaurant orders.": "أحدث طلبات المطعم.",
  "Your latest restaurant orders": "أحدث طلبات المطعم",
  "Top Customers": "أفضل العملاء",
  "Customers with the highest spending.": "العملاء الأكثر إنفاقًا.",
  "Customers with the highest spending": "العملاء الأكثر إنفاقًا",
  "No orders yet.": "لا توجد طلبات حتى الآن.",
  "No customers yet.": "لا يوجد عملاء حتى الآن.",
  "Walk-in Customer": "عميل مباشر",
  "Unknown Customer": "عميل غير معروف",
  "Quick overview of your customer base.": "نظرة سريعة على قاعدة عملائك.",

  // =========================
  // CUSTOMERS
  // =========================
  "Customer List": "قائمة العملاء",
  "All customers connected to your restaurant.": "جميع العملاء المرتبطين بمطعمك.",
  "All customers connected to your restaurant": "جميع العملاء المرتبطين بمطعمك",
  "Manage your restaurant customers and view their activity.": "أدر عملاء مطعمك وتابع نشاطهم.",
  "Add Customer": "إضافة عميل",
  "Add Customer +": "إضافة عميل +",
  "Customer": "العميل",
  "Contact": "بيانات الاتصال",
  "Total Spent": "إجمالي الإنفاق",
  "Lifetime Value": "القيمة الإجمالية",
  "Last Order": "آخر طلب",
  "No phone": "لا يوجد رقم هاتف",
  "No email": "لا يوجد بريد إلكتروني",
  "Never": "لم يطلب من قبل",
  "Edit Customer": "تعديل العميل",
  "Add New Customer": "إضافة عميل جديد",
  "Customer Profile": "ملف العميل",
  "Customer Information": "بيانات العميل",
  "Order History": "سجل الطلبات",

  // =========================
  // ORDERS
  // =========================
  "Track and manage your restaurant orders.": "تابع وأدر طلبات مطعمك.",
  "Your latest restaurant transactions.": "أحدث معاملات مطعمك.",
  "Order": "الطلب",
  "Total": "الإجمالي",
  "Status": "الحالة",
  "Date": "التاريخ",
  "Actions": "الإجراءات",
  "Edit": "تعديل",
  "Delete": "حذف",
  "Add Order": "إضافة طلب",
  "Add Order +": "إضافة طلب +",
  "Create Order": "إنشاء طلب",
  "Edit Order": "تعديل الطلب",
  "Save": "حفظ",
  "Cancel": "إلغاء",
  "Pending": "قيد الانتظار",
  "Completed": "مكتمل",
  "completed": "مكتمل",
  "Processing": "قيد التنفيذ",
  "processing": "قيد التنفيذ",
  "Cancelled": "ملغي",
  "cancelled": "ملغي",
  "Delivered": "تم التوصيل",
  "delivered": "تم التوصيل",
  "Confirmed": "مؤكد",
  "confirmed": "مؤكد",
  "No orders found.": "لا توجد طلبات.",

  // =========================
  // SEGMENTS
  // =========================
  "Understand your customers and identify your most valuable ones.": "افهم عملاءك وحدد العملاء الأكثر قيمة.",
  "Loading customer segments...": "جاري تحميل شرائح العملاء...",
  "Regular Customers": "العملاء المنتظمون",
  "New Customers": "العملاء الجدد",
  "Returning Customers": "العملاء العائدون",
  "At Risk Customers": "العملاء المعرضون للفقدان",
  "High-value customers with strong spending.": "عملاء ذوو قيمة عالية وإنفاق قوي.",
  "Returning customers who order regularly.": "عملاء عائدون يطلبون بشكل منتظم.",
  "Customers who are just getting started.": "عملاء بدأوا التعامل مع المطعم حديثًا.",
  "Automatically grouped based on orders and spending.": "يتم تجميعهم تلقائيًا حسب الطلبات والإنفاق.",
  "Customer Segmentation": "تقسيم العملاء",
  "Segmentation Rules": "قواعد تقسيم العملاء",
  "Spending $500+ or placing 5+ orders.": "إنفاق 500 دولار أو أكثر أو إجراء 5 طلبات أو أكثر.",
  "Spent $500+ or placed 5+ orders.": "أنفق 500 دولار أو أكثر أو أجرى 5 طلبات أو أكثر.",
  "Returning customers with more than one order.": "العملاء العائدون الذين لديهم أكثر من طلب.",
  "Customers with their first order.": "العملاء الذين لديهم طلبهم الأول.",

  // =========================
  // RETENTION
  // =========================
  "Identify customers who need attention and discover growth opportunities.": "حدد العملاء الذين يحتاجون إلى متابعة واكتشف فرص النمو.",
  "Refresh": "تحديث",
  "Repeat customers": "العملاء المتكررون",
  "High-value customers": "العملاء ذوو القيمة العالية",
  "days inactive +30": "أكثر من 30 يومًا بدون طلب",
  "Customer Opportunities": "فرص العملاء",
  "Customers with the strongest opportunity for re-engagement.": "العملاء الأكثر قابلية لإعادة التفاعل.",
  "No at-risk customers": "لا يوجد عملاء معرضون للفقدان",
  "Your current customer base looks healthy.": "قاعدة عملائك الحالية تبدو جيدة.",
  "No customers currently at risk": "لا يوجد عملاء معرضون للفقدان حاليًا",
  "Keep your customers engaged.": "حافظ على تفاعل عملائك.",
  "Needs attention": "يحتاج إلى متابعة",

  // =========================
  // CAMPAIGNS
  // =========================
  "Campaign Center": "مركز الحملات",
  "Build, schedule, and manage targeted customer retention campaigns.": "أنشئ وجدول وأدر حملات موجهة للاحتفاظ بالعملاء.",
  "Configure the audience, message, and schedule.": "حدد الجمهور والرسالة وموعد الإرسال.",
  "New Campaign": "حملة جديدة",
  "New Campaign +": "حملة جديدة +",
  "Current Audience": "الجمهور الحالي",
  "Drafts": "المسودات",
  "Scheduled": "مجدولة",
  "Sent": "تم الإرسال",
  "Message Preview": "معاينة الرسالة",
  "Preview the selected channel and WhatsApp template.": "معاينة القناة والقالب المحدد لواتساب.",
  "Campaign Builder": "منشئ الحملات",
  "Campaign Name": "اسم الحملة",
  "Audience": "الجمهور",
  "Campaign Message / Preview": "رسالة الحملة / المعاينة",
  "Message": "الرسالة",
  "Subject": "الموضوع",
  "Channel": "القناة",
  "Schedule": "الجدولة",
  "Save Draft": "حفظ كمسودة",
  "Schedule Campaign": "جدولة الحملة",
  "Edit Campaign": "تعديل الحملة",
  "Campaign History": "سجل الحملات",
  "Selected Audience": "الجمهور المحدد",
  "VIP Loyalty Campaign": "حملة ولاء عملاء VIP",
  "Returning Customer Campaign": "حملة العملاء العائدين",
  "New Customer Campaign": "حملة العملاء الجدد",
  "Welcome Offer": "عرض ترحيبي",
  "We Miss You": "اشتقنا إليك",
  "VIP Customer Offer": "عرض خاص لعميل VIP",
  "We'd Love to See You Again": "نحب أن نراك مرة أخرى",
  "WhatsApp Template Delivery": "إرسال قالب واتساب",
  "WhatsApp delivery is connected through Meta Cloud API.": "إرسال واتساب متصل عبر Meta Cloud API.",
  "The campaign will use the selected approved template.": "ستستخدم الحملة القالب المعتمد المحدد.",
  "customers targeted": "عملاء مستهدفون",
  "recipients": "مستلمين",

  // =========================
  // AUTOMATION
  // =========================
  "Automation Center": "مركز الأتمتة",
  "Monitor scheduled campaigns and execute due delivery jobs.": "تابع الحملات المجدولة ونفّذ مهام الإرسال المستحقة.",
  "Refresh Queue": "تحديث قائمة الانتظار",
  "Refreshing...": "جاري التحديث...",
  "Run Due Jobs": "تشغيل المهام المستحقة",
  "Running...": "جاري التشغيل...",
  "Upcoming": "قادمة",
  "Ready": "جاهزة",
  "Total Queue": "إجمالي قائمة الانتظار",
  "Scheduled for later": "مجدولة لوقت لاحق",
  "Waiting for execution": "في انتظار التنفيذ",
  "Marked as sent": "تم تسجيلها كمرسلة",
  "Scheduled campaigns": "الحملات المجدولة",
  "Execution Result": "نتيجة التنفيذ",
  "Execution Queue": "قائمة تنفيذ المهام",
  "Campaigns that are due or approaching their scheduled time.": "الحملات المستحقة أو التي اقترب موعد تنفيذها.",
  "Queue is empty": "قائمة الانتظار فارغة",
  "Schedule a campaign to add a job here.": "قم بجدولة حملة لإضافة مهمة هنا.",
  "Ready Jobs": "المهام الجاهزة",
  "Campaigns whose scheduled time has arrived.": "الحملات التي حان موعد تنفيذها.",
  "No jobs ready": "لا توجد مهام جاهزة",
  "Nothing is waiting for execution right now.": "لا توجد مهام في انتظار التنفيذ حاليًا.",
  "Upcoming Jobs": "المهام القادمة",
  "Scheduled campaigns waiting for their execution time.": "الحملات المجدولة التي تنتظر موعد التنفيذ.",
  "No upcoming jobs": "لا توجد مهام قادمة",
  "Schedule a future campaign from Campaigns.": "قم بجدولة حملة مستقبلية من صفحة الحملات.",
  "Automation engine status": "حالة محرك الأتمتة",
  "Try Again": "حاول مرة أخرى",
  "No campaigns are due right now.": "لا توجد حملات مستحقة الآن.",
  "Not scheduled": "غير مجدولة",
  "Not Queued": "غير مضافة لقائمة الانتظار",
  "Missing Schedule": "موعد الجدولة مفقود",

  // =========================
  // WHATSAPP
  // =========================
  "WhatsApp Center": "مركز واتساب",
  "Monitor WhatsApp campaign delivery and message status.": "تابع إرسال حملات واتساب وحالة الرسائل.",
  "Read": "تمت القراءة",
  "Failed": "فشل",
  "Queue": "قائمة الانتظار",
  "Sending": "جاري الإرسال",
  "Currently processing": "قيد المعالجة حاليًا",
  "Waiting to execute": "في انتظار التنفيذ",
  "Requires attention": "يحتاج إلى متابعة",
  "Latest WhatsApp campaign recipients.": "أحدث مستلمي حملات واتساب.",
  "Phone": "رقم الهاتف",
  "Provider ID": "معرف المزود",
  "Updated": "آخر تحديث",
  "Error": "خطأ",
  "Auto refresh: 15s": "تحديث تلقائي: 15 ثانية",
  "Meta Cloud API": "Meta Cloud API",

  // =========================
  // SETTINGS
  // =========================
  "Configure your restaurant growth and messaging connections.": "اضبط إعدادات نمو المطعم واتصالات المراسلة.",
  "WhatsApp Business": "واتساب للأعمال",
  "Connect and test your WhatsApp Business messaging setup.": "اربط واختبر إعداد المراسلة الخاص بواتساب للأعمال.",
  "Phone Number ID": "معرف رقم الهاتف",
  "Graph API Version": "إصدار Graph API",
  "Use the version configured for your Meta app.": "استخدم الإصدار المُعد في تطبيق Meta الخاص بك.",
  "Access Token": "رمز الوصول",
  "Paste your Meta access token": "الصق رمز الوصول الخاص بـ Meta",
  "Not Connected": "غير متصل",
  "Test WhatsApp Connection": "اختبار اتصال واتساب",
  "Clear": "مسح",
  "Send Test Message": "إرسال رسالة اختبار",
  "Send one WhatsApp test message before connecting campaigns.": "أرسل رسالة واتساب تجريبية قبل ربط الحملات.",
  "Please enter your WhatsApp access token.": "أدخل رمز وصول واتساب.",
  "Please enter your WhatsApp phone number ID.": "أدخل معرف رقم واتساب.",
  "Please enter your WhatsApp API version.": "أدخل إصدار WhatsApp API.",
  "WhatsApp connection verified.": "تم التحقق من اتصال واتساب بنجاح.",
  "WhatsApp connection failed.": "فشل اتصال واتساب.",

  // =========================
  // AUTH
  // =========================
  "Email": "البريد الإلكتروني",
  "Password": "كلمة المرور",
  "Confirm Password": "تأكيد كلمة المرور",
  "Log in": "تسجيل الدخول",
  "Logging in...": "جاري تسجيل الدخول...",
  "Forgot your password?": "هل نسيت كلمة المرور؟",
  "Don't have an account? Sign up": "ليس لديك حساب؟ إنشاء حساب",
  "Sign up": "إنشاء حساب",
  "Signing up...": "جاري إنشاء الحساب...",
  "Create account": "إنشاء حساب",
  "Already have an account? Log in": "لديك حساب بالفعل؟ تسجيل الدخول",
  "You are not logged in.": "أنت غير مسجل الدخول.",
  "Restaurant not found.": "لم يتم العثور على المطعم.",
  "Loading...": "جاري التحميل...",
  "Something went wrong.": "حدث خطأ ما.",
};

function translateText(value: string, language: "en" | "ar") {
  if (language !== "ar") {
    return value;
  }

  return dictionary[value] ?? value;
}

function translateNode(
  node: ReactNode,
  language: "en" | "ar"
): ReactNode {
  if (typeof node === "string") {
    return translateText(node, language);
  }

  if (
    typeof node === "number" ||
    node === null ||
    node === undefined
  ) {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <React.Fragment key={index}>
        {translateNode(child, language)}
      </React.Fragment>
    ));
  }

  if (!isValidElement(node)) {
    return node;
  }

  const props = node.props as Record<string, unknown>;
  const nextProps: Record<string, unknown> = {};

  Object.keys(props).forEach((key) => {
    const value = props[key];

    if (
      typeof value === "string" &&
      (
        key === "placeholder" ||
        key === "title" ||
        key === "aria-label" ||
        key === "alt"
      )
    ) {
      nextProps[key] = translateText(value, language);
      return;
    }

    if (key === "children") {
      nextProps[key] = translateNode(
        value as ReactNode,
        language
      );
      return;
    }

    nextProps[key] = value;
  });

  return React.cloneElement(node, nextProps);
}

export function TranslationBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const { language } = useLanguage();

  return (
    <>
      {translateNode(children, language)}
    </>
  );
}
