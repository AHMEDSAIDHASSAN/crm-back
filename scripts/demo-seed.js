/**
 * SIRA CRM — Comprehensive Demo Seed
 * Run: node scripts/demo-seed.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randBool = (prob = 0.5) => Math.random() < prob;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

const firstNames = ['أحمد','محمد','علي','عمر','خالد','يوسف','كريم','مصطفى','إبراهيم','حسن','سامي','طارق','رامي','ماهر','وليد','هاني','نادر','شريف','جمال','فادي','ليلى','نورا','سارة','مريم','دينا','رنا','ياسمين','هبة','نها','روان','سلمى','غادة','آية','منى','إيمان'];
const lastNames = ['محمود','عبدالله','السيد','إبراهيم','حسن','عمر','خالد','مصطفى','علي','أحمد','البكري','الشرقاوي','عبدالعزيز','حسين','رضا','النجار','العمري','الغامدي','الزهراني','المصري','شاهين','درويش','سلامة','منصور','فاروق'];
const egyptPhones = () => `01${rand(['0','1','2','5'])}${String(randInt(10000000,99999999))}`;
const emails = (fn, ln) => `${fn.replace(/\s/g,'')}${ln.replace(/\s/g,'')}_${randInt(10,99)}@gmail.com`;

const STATUSES = ['new_lead','cold_call','follow_up','qualified','no_answer','wrong_number','not_interested','interested','contacted','meeting_cancelled','rotation'];
const PRIORITIES = ['low','medium','medium','high','urgent'];
const MEETING_TYPES = ['site_visit','office','virtual','other'];
const MEETING_STATUSES = ['scheduled','completed','cancelled','no_show'];
const UNIT_TYPES = ['apartment','villa','duplex','studio','penthouse','chalet','twin_house'];
const PROJECTS = ['كمبوند الرحاب','القاهرة الجديدة','أكتوبر الجديدة','بيت الوطن','الشيخ زايد','الساحل الشمالي','مدينتي','الحي اللاتيني','فيلانوفا','ماونتن فيو'];
const LOCATIONS = ['القاهرة الجديدة','6 أكتوبر','التجمع الخامس','مدينة نصر','المعادي','الزمالك','الشروق','بدر','العبور','الساحل الشمالي'];
const FEEDBACK_TEXTS = [
  'العميل مهتم وطلب مزيداً من التفاصيل عن الأسعار',
  'لم يرد على المكالمة - سيتم المتابعة لاحقاً',
  'العميل مهتم بشقة 3 غرف - قريبة من المدارس',
  'طلب العميل عرض سعر تفصيلي',
  'العميل يريد موعد معاينة الوحدة',
  'غير مهتم حالياً - ميزانيته محدودة',
  'تم الاتفاق على اجتماع الأسبوع القادم',
  'العميل يقارن بين أكثر من مشروع',
  'مهتم جداً - يريد التعاقد هذا الشهر',
  'طلب تأجيل الاتصال لمدة شهر',
];
const NOTES = [
  'يفضل التواصل في المساء',
  'موظف حكومي - يريد تمويل عقاري',
  'لديه أطفال ويهتم بقرب المدارس',
  'يريد التسليم خلال عام',
  'مستثمر يبحث عن عائد إيجاري',
  'يريد وحدة بحديقة',
  'بجتعه لا تتجاوز 2.5 مليون',
  'مقيم في الخارج - يبحث عن استثمار',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting SIRA demo seed...\n');

  // ── Fetch existing IDs ────────────────────────────────────────────────────
  const salesUsers = await p.user.findMany({
    where: { role: { name: { in: ['sales', 'sales_manager', 'tech_lead'] } } },
    select: { id: true, firstName: true },
  });
  const salesIds = salesUsers.map(u => u.id);
  const [adminUser] = await p.user.findMany({ where: { role: { name: 'super_admin' } }, select: { id: true }, take: 1 });
  const [omUser] = await p.user.findMany({ where: { role: { name: 'operation_manager' } }, select: { id: true }, take: 1 });
  const sources = await p.leadSource.findMany({ select: { id: true } });
  const campaigns = await p.campaign.findMany({ select: { id: true } });
  const teams = await p.team.findMany({ select: { id: true } });

  const sourceIds = sources.map(s => s.id);
  const campaignIds = campaigns.map(c => c.id);
  const teamIds = teams.map(t => t.id);
  const adminId = adminUser?.id ?? 1n;
  const omId = omUser?.id ?? 2n;

  // ── 1. Units (50) ────────────────────────────────────────────────────────
  console.log('🏠 Creating units...');
  const existingCodes = new Set((await p.unit.findMany({ select: { code: true } })).map(u => u.code));
  const unitData = [];
  for (let i = 1; i <= 50; i++) {
    const code = `UNIT-${String(1000 + i).padStart(4,'0')}`;
    if (existingCodes.has(code)) continue;
    const proj = rand(PROJECTS);
    const type = rand(UNIT_TYPES);
    const beds = randInt(1, 5);
    const price = randInt(800, 8000) * 1000;
    unitData.push({
      code,
      description: `${type} في مشروع ${proj} - ${beds} غرف نوم، موقع مميز، إطلالة رائعة`,
      address: `${proj}، ${rand(LOCATIONS)}`,
      projectName: proj,
      location: rand(LOCATIONS),
      floor: randInt(1, 20),
      price,
      monthlyInstallment: Math.round(price / 120),
      deliveryDate: daysFromNow(randInt(180, 1095)),
      bedrooms: beds,
      bathrooms: randInt(1, beds),
      area: randInt(80, 400),
      unitType: type,
      amenities: JSON.stringify(['جراج','حمام سباحة','جيم','أمن 24 ساعة'].slice(0, randInt(1,4))),
      createdBy: adminId,
      status: rand(['available','available','available','reserved','sold']),
    });
  }
  if (unitData.length > 0) {
    await p.unit.createMany({ data: unitData, skipDuplicates: true });
  }
  console.log(`   ✓ ${unitData.length} units created`);

  // ── 2. Leads (200) ───────────────────────────────────────────────────────
  console.log('👥 Creating leads...');
  const existingPhones = new Set((await p.lead.findMany({ select: { phone: true } })).map(l => l.phone));
  const leadsData = [];
  let phoneAttempts = 0;
  while (leadsData.length < 200 && phoneAttempts < 1000) {
    phoneAttempts++;
    const phone = egyptPhones();
    if (existingPhones.has(phone)) continue;
    existingPhones.add(phone);
    const fn = rand(firstNames);
    const ln = rand(lastNames);
    const status = rand(STATUSES);
    const assignedTo = randBool(0.7) ? rand(salesIds) : null;
    const campaignId = randBool(0.4) ? rand(campaignIds) : null;
    const daysOld = randInt(0, 180);
    leadsData.push({
      firstName: fn,
      lastName: ln,
      phone,
      email: randBool(0.6) ? emails(fn, ln) : null,
      leadSourceId: rand(sourceIds),
      campaignId,
      status,
      priority: rand(PRIORITIES),
      assignedTo,
      assignedAt: assignedTo ? daysAgo(randInt(0, daysOld)) : null,
      teamId: randBool(0.5) ? rand(teamIds) : null,
      notes: randBool(0.4) ? rand(NOTES) : null,
      createdAt: daysAgo(daysOld),
      updatedAt: daysAgo(randInt(0, daysOld)),
      type: campaignId ? 'campaign' : rand(['primary', 'cold_call']),
    });
  }

  for (const batch of chunk(leadsData, 50)) {
    await p.lead.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`   ✓ ${leadsData.length} leads created`);

  // ── 3. Fetch all lead IDs ─────────────────────────────────────────────────
  const allLeads = await p.lead.findMany({ select: { id: true, assignedTo: true, phone: true, firstName: true } });
  const assignedLeads = allLeads.filter(l => l.assignedTo != null);

  // ── 4. Lead Assignments (history) ────────────────────────────────────────
  console.log('📋 Creating lead assignments...');
  const assignmentData = assignedLeads.slice(0, 120).map(lead => ({
    leadId: lead.id,
    assignedTo: lead.assignedTo,
    assignedBy: randBool(0.6) ? omId : adminId,
    assignmentType: rand(['manual','rotation']),
    reason: rand(['تعيين يدوي','توزيع دوري','إعادة توزيع',null]),
    assignedAt: daysAgo(randInt(0, 90)),
  }));
  await p.leadAssignment.createMany({ data: assignmentData, skipDuplicates: true });
  console.log(`   ✓ ${assignmentData.length} assignments created`);

  // ── 5. Lead Feedbacks ────────────────────────────────────────────────────
  console.log('💬 Creating feedbacks...');
  const feedbackData = [];
  for (const lead of assignedLeads.slice(0, 100)) {
    const count = randInt(1, 4);
    for (let i = 0; i < count; i++) {
      feedbackData.push({
        leadId: lead.id,
        userId: lead.assignedTo,
        feedbackType: rand(['follow_up','interested','not_interested','no_answer','qualified','contacted']),
        description: rand(FEEDBACK_TEXTS),
        nextAction: randBool(0.5) ? rand(['مكالمة متابعة','إرسال عرض','تحديد موعد معاينة','إرسال كتالوج']) : null,
        nextActionDate: randBool(0.4) ? daysFromNow(randInt(1, 14)) : null,
        callDuration: randBool(0.7) ? randInt(30, 600) : null,
        createdAt: daysAgo(randInt(0, 60)),
      });
    }
  }
  for (const batch of chunk(feedbackData, 100)) {
    await p.leadFeedback.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`   ✓ ${feedbackData.length} feedbacks created`);

  // ── 6. Meetings ──────────────────────────────────────────────────────────
  console.log('📅 Creating meetings...');
  const meetingData = [];
  for (const lead of assignedLeads.slice(0, 80)) {
    if (!randBool(0.5)) continue;
    const status = rand(MEETING_STATUSES);
    const past = randBool(0.6);
    const meetingDate = past ? daysAgo(randInt(1, 60)) : daysFromNow(randInt(1, 30));
    meetingData.push({
      leadId: lead.id,
      scheduledBy: lead.assignedTo,
      meetingDate,
      location: rand([...LOCATIONS, 'المكتب الرئيسي', 'أونلاين']),
      meetingType: rand(MEETING_TYPES),
      status,
      notes: randBool(0.5) ? rand(NOTES) : null,
      outcome: status === 'completed' ? rand(['مهتم بالشراء','يريد التفكير','طلب عرض أسعار','سيعود للتواصل']) : null,
      feedback: status === 'completed' ? rand(FEEDBACK_TEXTS) : null,
      startedAt: status === 'completed' ? meetingDate : null,
      endedAt: status === 'completed' ? new Date(meetingDate.getTime() + randInt(30, 120) * 60000) : null,
      createdAt: daysAgo(randInt(0, 90)),
    });
  }
  await p.meeting.createMany({ data: meetingData, skipDuplicates: true });
  console.log(`   ✓ ${meetingData.length} meetings created`);

  // ── 7. Call Logs ─────────────────────────────────────────────────────────
  console.log('📞 Creating call logs...');
  const allFeedbacks = await p.leadFeedback.findMany({ select: { id: true, leadId: true, userId: true }, take: 150 });
  const callData = allFeedbacks.slice(0, 100).map(fb => ({
    leadId: fb.leadId,
    userId: fb.userId,
    feedbackId: fb.id,
    callType: rand(['outbound','inbound']),
    callStatus: rand(['completed','no_answer','busy','failed']),
    duration: randInt(10, 720),
    initiatedFrom: rand(['web','mobile']),
    createdAt: daysAgo(randInt(0, 60)),
  }));
  await p.callLog.createMany({ data: callData, skipDuplicates: true });
  console.log(`   ✓ ${callData.length} call logs created`);

  // ── 8. WhatsApp Interactions ─────────────────────────────────────────────
  console.log('💬 Creating WhatsApp interactions...');
  const waData = assignedLeads.slice(0, 60).map(lead => ({
    leadId: lead.id,
    userId: lead.assignedTo,
    messageCount: randInt(1, 10),
    lastMessageAt: daysAgo(randInt(0, 30)),
    initiatedFrom: rand(['web','mobile']),
    createdAt: daysAgo(randInt(0, 60)),
  }));
  await p.whatsappInteraction.createMany({ data: waData, skipDuplicates: true });
  console.log(`   ✓ ${waData.length} WhatsApp interactions created`);

  // ── 9. Attendance Logs ───────────────────────────────────────────────────
  console.log('🕐 Creating attendance logs...');
  const attendanceData = [];
  for (const user of salesUsers.slice(0, 10)) {
    for (let d = 30; d >= 1; d--) {
      const date = daysAgo(d);
      if (date.getDay() === 5 || date.getDay() === 6) continue;
      const checkin = new Date(date);
      checkin.setHours(randInt(8, 10), randInt(0, 59), 0, 0);
      const isLate = checkin.getHours() >= 9;
      const lateMinutes = isLate ? randInt(5, 60) : 0;
      const checkout = randBool(0.85) ? new Date(checkin.getTime() + randInt(6, 10) * 3600000) : null;
      const workDuration = checkout ? Math.round((checkout - checkin) / 60000) : null;
      attendanceData.push({
        userId: user.id,
        checkInTime: checkin,
        checkInLocation: randBool(0.5) ? `${30 + Math.random()},${31 + Math.random()}` : null,
        checkOutTime: checkout,
        checkOutLocation: checkout && randBool(0.4) ? `${30 + Math.random()},${31 + Math.random()}` : null,
        isLate,
        lateMinutes: isLate ? lateMinutes : 0,
        workDuration,
        notes: null,
      });
    }
  }
  await p.attendanceLog.createMany({ data: attendanceData, skipDuplicates: true });
  console.log(`   ✓ ${attendanceData.length} attendance records created`);

  // ── 10. Notifications ────────────────────────────────────────────────────
  console.log('🔔 Creating notifications...');
  const notifTypes = ['lead_assigned','lead_retracted','meeting_scheduled','meeting_reminder'];
  const notifData = [];
  for (const user of salesUsers.slice(0, 8)) {
    for (let i = 0; i < randInt(5, 15); i++) {
      const nType = rand(notifTypes);
      notifData.push({
        userId: user.id,
        notificationType: nType,
        title: nType === 'lead_assigned' ? 'تم تعيين ليد جديد لك' :
               nType === 'lead_retracted' ? 'تم سحب ليد منك' :
               nType === 'meeting_scheduled' ? 'اجتماع مجدول' : 'تذكير اجتماع',
        message: rand([
          'تم تعيين عميل جديد لك في النظام',
          'لديك اجتماع مجدول غداً',
          'يرجى تحديث حالة العميل',
          'تذكير: متابعة العملاء المهتمين',
          'تم تحديث بيانات الوحدة',
        ]),
        isRead: randBool(0.6),
        relatedEntityType: rand(['lead','meeting',null]),
        createdAt: daysAgo(randInt(0, 30)),
      });
    }
  }
  await p.notification.createMany({ data: notifData, skipDuplicates: true });
  console.log(`   ✓ ${notifData.length} notifications created`);

  // ── 11. Finance - Commission Rates ───────────────────────────────────────
  console.log('💰 Creating finance data...');
  // Commission Rates (per developer)
  const developers = ['بالم هيلز','طلعت مصطفى','سيتي إيدج','إعمار','سودي','ماونتن فيو'];
  const existingRates = await p.commissionRate.findMany({ select: { developerName: true } });
  const existingDevs = new Set(existingRates.map(r => r.developerName));
  const commissionData = developers
    .filter(d => !existingDevs.has(d))
    .map(d => ({
      developerName: d,
      companyRatePct: randInt(2, 5),
      salesRatePct: randInt(20, 40),
      taxRatePct: 14,
      isActive: true,
    }));
  if (commissionData.length > 0) {
    await p.commissionRate.createMany({ data: commissionData, skipDuplicates: true });
  }

  // Finance Transactions (general income/expense)
  const months = ['2026-01','2026-02','2026-03','2026-04','2026-05'];
  const txData = [];
  for (const month of months) {
    // Income entries
    for (let i = 0; i < randInt(3, 6); i++) {
      const d = new Date(month + '-' + String(randInt(1,28)).padStart(2,'0'));
      txData.push({
        type: 'INCOME',
        category: rand(['مبيعات وحدات','عمولات','إيجارات','خدمات']),
        amount: randInt(50000, 500000),
        description: rand(['إيرادات مبيعات الشهر','عمولة بيع وحدة','إيجار مكتب','خدمات استشارية']),
        date: d,
        department: rand(['المبيعات','التسويق','الإدارة']),
        month,
        createdById: adminId,
      });
    }
    // Expense entries
    for (let i = 0; i < randInt(4, 8); i++) {
      const d = new Date(month + '-' + String(randInt(1,28)).padStart(2,'0'));
      txData.push({
        type: 'EXPENSE',
        category: rand(['رواتب','إيجار','تسويق','مصاريف تشغيلية','مواصلات']),
        amount: randInt(5000, 80000),
        description: rand(['رواتب الموظفين','إيجار المكتب','إعلانات فيسبوك','مصاريف إدارية','فواتير خدمات']),
        date: d,
        department: rand(['الإدارة','التسويق','المبيعات']),
        month,
        createdById: adminId,
      });
    }
  }
  await p.financeTransaction.createMany({ data: txData, skipDuplicates: true });
  console.log(`   ✓ ${commissionData.length} commission rates + ${txData.length} finance transactions created`);

  // ── 12. Resale Units ─────────────────────────────────────────────────────
  console.log('🏢 Creating resale units...');
  const units = await p.unit.findMany({ select: { id: true }, take: 20 });
  const resaleData = Array.from({ length: 12 }, (_, i) => {
    const type = rand(UNIT_TYPES);
    const proj = rand(PROJECTS);
    return {
      code: `RES-${String(100 + i + 1).padStart(4,'0')}`,
      description: `${type} إعادة بيع في ${proj} - حالة ممتازة`,
      ownerName: `${rand(firstNames)} ${rand(lastNames)}`,
      ownerPhone: egyptPhones(),
      location: rand(LOCATIONS),
      askingPrice: randInt(1500, 6000) * 1000,
      bedrooms: randInt(1, 4),
      bathrooms: randInt(1, 3),
      area: randInt(80, 300),
      unitType: type,
      status: rand(['available','available','available','sold']),
      createdBy: adminId,
    };
  });
  await p.resaleUnit.createMany({ data: resaleData, skipDuplicates: true });
  console.log(`   ✓ ${resaleData.length} resale units created`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Demo seed complete!\n');
  const finalCounts = {
    leads: await p.lead.count(),
    units: await p.unit.count(),
    meetings: await p.meeting.count(),
    feedbacks: await p.leadFeedback.count(),
    assignments: await p.leadAssignment.count(),
    callLogs: await p.callLog.count(),
    whatsapp: await p.whatsappInteraction.count(),
    attendance: await p.attendanceLog.count(),
    notifications: await p.notification.count(),
    resale: await p.resaleUnit.count(),
  };
  console.log('📊 Final counts:');
  Object.entries(finalCounts).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e.message); process.exit(1); })
  .finally(() => p.$disconnect());
