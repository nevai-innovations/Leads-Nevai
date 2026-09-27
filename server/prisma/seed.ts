import { PrismaClient, Interest, LeadStatus, WashType, CurrentSystem } from '@prisma/client';

const prisma = new PrismaClient();

type SeedLead = {
  businessName: string;
  contactName: string;
  location: string;
  district: string;
  coords: string;
  washType: WashType;
  dailyVehicles: number;
  currentSystem: CurrentSystem;
  remarks: string;
  interest: Interest;
  status: LeadStatus;
  collectedBy: string;
  createdDaysAgo: number;
  followUpInDays: number | null; // negative = overdue
  whatsappSame?: boolean;
};

// Fictional sample businesses spread across Kerala districts.
const leads: SeedLead[] = [
  { businessName: 'Sparkle Auto Spa', contactName: 'Anil Kumar', location: 'Kowdiar', district: 'Thiruvananthapuram', coords: '8.5241,76.9606', washType: 'DETAILING', dailyVehicles: 35, currentSystem: 'NOTEBOOK', remarks: 'Loses track of repeat customers; wants SMS reminders for ceramic coating renewals.', interest: 'HOT', status: 'DEMO_SCHEDULED', collectedBy: 'Rahul Nair', createdDaysAgo: 52, followUpInDays: 0, whatsappSame: true },
  { businessName: 'Capital Car Care', contactName: 'Sreejith S', location: 'Pattom', district: 'Thiruvananthapuram', coords: '8.5170,76.9420', washType: 'MULTI_SERVICE', dailyVehicles: 60, currentSystem: 'EXCEL', remarks: 'Manages 3 staff shifts in Excel. Interested in staff attendance + billing.', interest: 'HOT', status: 'CONVERTED', collectedBy: 'Rahul Nair', createdDaysAgo: 48, followUpInDays: null, whatsappSame: true },
  { businessName: 'AquaShine Wash Point', contactName: 'Biju Thomas', location: 'Kazhakkoottam', district: 'Thiruvananthapuram', coords: '8.5686,76.8731', washType: 'AUTOMATIC', dailyVehicles: 80, currentSystem: 'EXISTING_SOFTWARE', remarks: 'Uses a generic POS; unhappy with lack of membership plans.', interest: 'WARM', status: 'CONTACTED', collectedBy: 'Divya Menon', createdDaysAgo: 40, followUpInDays: -3 },
  { businessName: 'Quilon Quick Wash', contactName: 'Shaji Mathew', location: 'Chinnakada', district: 'Kollam', coords: '8.8932,76.6141', washType: 'MANUAL', dailyVehicles: 25, currentSystem: 'NOTEBOOK', remarks: 'Small setup, owner handles cash. Price sensitive.', interest: 'COLD', status: 'CONTACTED', collectedBy: 'Divya Menon', createdDaysAgo: 45, followUpInDays: 12 },
  { businessName: 'Ashtamudi Auto Wash', contactName: 'Rajesh Pillai', location: 'Karunagappally', district: 'Kollam', coords: '9.0590,76.5350', washType: 'MULTI_SERVICE', dailyVehicles: 45, currentSystem: 'WHATSAPP', remarks: 'Takes bookings over WhatsApp; double bookings on weekends.', interest: 'HOT', status: 'DEMO_SCHEDULED', collectedBy: 'Rahul Nair', createdDaysAgo: 30, followUpInDays: 1, whatsappSame: true },
  { businessName: 'Pathanamthitta Car Studio', contactName: 'Jijo Varghese', location: 'Adoor', district: 'Pathanamthitta', coords: '9.1550,76.7350', washType: 'DETAILING', dailyVehicles: 18, currentSystem: 'NONE', remarks: 'New business, open to a system from day one.', interest: 'WARM', status: 'NEW', collectedBy: 'Arjun Das', createdDaysAgo: 6, followUpInDays: 2 },
  { businessName: 'Backwater Shine', contactName: 'Manoj K', location: 'Mullakkal', district: 'Alappuzha', coords: '9.4981,76.3388', washType: 'MANUAL', dailyVehicles: 30, currentSystem: 'NOTEBOOK', remarks: 'Wants daily collection summary on phone.', interest: 'WARM', status: 'CONTACTED', collectedBy: 'Arjun Das', createdDaysAgo: 36, followUpInDays: -1, whatsappSame: true },
  { businessName: 'Kuttanad Car Wash', contactName: 'Thomas Chacko', location: 'Changanassery Road', district: 'Alappuzha', coords: '9.4400,76.4500', washType: 'MANUAL', dailyVehicles: 15, currentSystem: 'NONE', remarks: 'Not interested in any software at this time.', interest: 'NOT_INTERESTED', status: 'LOST', collectedBy: 'Arjun Das', createdDaysAgo: 50, followUpInDays: null },
  { businessName: 'Kottayam Auto Glow', contactName: 'Sabu Joseph', location: 'Baker Junction', district: 'Kottayam', coords: '9.5916,76.5222', washType: 'MULTI_SERVICE', dailyVehicles: 55, currentSystem: 'EXCEL', remarks: 'Needs inventory tracking for shampoo/wax consumables.', interest: 'HOT', status: 'CONTACTED', collectedBy: 'Divya Menon', createdDaysAgo: 22, followUpInDays: 0 },
  { businessName: 'Pala Pro Detailers', contactName: 'Ajo Kurian', location: 'Pala', district: 'Kottayam', coords: '9.7120,76.6830', washType: 'DETAILING', dailyVehicles: 12, currentSystem: 'WHATSAPP', remarks: 'Premium clients; wants before/after photo records.', interest: 'WARM', status: 'DEMO_SCHEDULED', collectedBy: 'Divya Menon', createdDaysAgo: 18, followUpInDays: 4 },
  { businessName: 'Highrange Car Wash', contactName: 'Saji P', location: 'Thodupuzha', district: 'Idukki', coords: '9.8950,76.7170', washType: 'MANUAL', dailyVehicles: 20, currentSystem: 'NOTEBOOK', remarks: 'Seasonal tourist traffic. Maybe after monsoon.', interest: 'COLD', status: 'NEW', collectedBy: 'Arjun Das', createdDaysAgo: 12, followUpInDays: 20 },
  { businessName: 'Munnar Hill Wash', contactName: 'Muthu R', location: 'Munnar', district: 'Idukki', coords: '10.0889,77.0595', washType: 'MANUAL', dailyVehicles: 22, currentSystem: 'NONE', remarks: 'Serves taxi fleets; asked about fleet billing.', interest: 'WARM', status: 'CONTACTED', collectedBy: 'Arjun Das', createdDaysAgo: 26, followUpInDays: -5 },
  { businessName: 'Kochi Car Spa', contactName: 'Faisal Rahman', location: 'Edappally', district: 'Ernakulam', coords: '10.0261,76.3083', washType: 'AUTOMATIC', dailyVehicles: 120, currentSystem: 'EXISTING_SOFTWARE', remarks: 'High volume. Current software has no WhatsApp integration.', interest: 'HOT', status: 'CONVERTED', collectedBy: 'Rahul Nair', createdDaysAgo: 55, followUpInDays: null, whatsappSame: true },
  { businessName: 'Marine Drive Auto Care', contactName: 'Nikhil George', location: 'Marine Drive', district: 'Ernakulam', coords: '9.9816,76.2780', washType: 'DETAILING', dailyVehicles: 40, currentSystem: 'EXCEL', remarks: 'Wants customer loyalty points.', interest: 'HOT', status: 'DEMO_SCHEDULED', collectedBy: 'Rahul Nair', createdDaysAgo: 14, followUpInDays: -2 },
  { businessName: 'Kakkanad Wash Hub', contactName: 'Ramesh Babu', location: 'Kakkanad', district: 'Ernakulam', coords: '10.0159,76.3419', washType: 'MULTI_SERVICE', dailyVehicles: 75, currentSystem: 'WHATSAPP', remarks: 'IT park customers want online slot booking.', interest: 'HOT', status: 'CONTACTED', collectedBy: 'Sneha Raj', createdDaysAgo: 9, followUpInDays: 0, whatsappSame: true },
  { businessName: 'Aluva Shine Station', contactName: 'Shameer A', location: 'Aluva', district: 'Ernakulam', coords: '10.1004,76.3570', washType: 'MANUAL', dailyVehicles: 35, currentSystem: 'NOTEBOOK', remarks: 'Staff theft concerns; wants cash reconciliation.', interest: 'WARM', status: 'NEW', collectedBy: 'Sneha Raj', createdDaysAgo: 3, followUpInDays: 3 },
  { businessName: 'Vyttila Express Wash', contactName: 'Deepak Menon', location: 'Vyttila', district: 'Ernakulam', coords: '9.9667,76.3180', washType: 'AUTOMATIC', dailyVehicles: 90, currentSystem: 'EXISTING_SOFTWARE', remarks: 'Contract with current vendor till March.', interest: 'COLD', status: 'LOST', collectedBy: 'Sneha Raj', createdDaysAgo: 33, followUpInDays: null },
  { businessName: 'Thrissur Auto Wash', contactName: 'Vinod Kumar', location: 'Swaraj Round', district: 'Thrissur', coords: '10.5276,76.2144', washType: 'MULTI_SERVICE', dailyVehicles: 65, currentSystem: 'EXCEL', remarks: 'Wants GST billing and monthly reports.', interest: 'HOT', status: 'CONVERTED', collectedBy: 'Sneha Raj', createdDaysAgo: 42, followUpInDays: null },
  { businessName: 'Guruvayur Car Care', contactName: 'Prakash T', location: 'Guruvayur', district: 'Thrissur', coords: '10.5940,76.0410', washType: 'MANUAL', dailyVehicles: 40, currentSystem: 'NOTEBOOK', remarks: 'Pilgrim season rush; queue management needed.', interest: 'WARM', status: 'CONTACTED', collectedBy: 'Sneha Raj', createdDaysAgo: 20, followUpInDays: 5 },
  { businessName: 'Chalakudy Wash & Go', contactName: 'Linto Paul', location: 'Chalakudy', district: 'Thrissur', coords: '10.3070,76.3340', washType: 'MANUAL', dailyVehicles: 28, currentSystem: 'NONE', remarks: 'Owner rarely at shop; wants remote visibility.', interest: 'HOT', status: 'NEW', collectedBy: 'Divya Menon', createdDaysAgo: 2, followUpInDays: 1 },
  { businessName: 'Palakkad Pit Stop', contactName: 'Suresh Iyer', location: 'Olavakkode', district: 'Palakkad', coords: '10.7867,76.6548', washType: 'MULTI_SERVICE', dailyVehicles: 50, currentSystem: 'EXCEL', remarks: 'Has a tyre shop too; wants combined billing.', interest: 'WARM', status: 'DEMO_SCHEDULED', collectedBy: 'Arjun Das', createdDaysAgo: 16, followUpInDays: -4 },
  { businessName: 'Ottapalam Car Wash', contactName: 'Hari Das', location: 'Ottapalam', district: 'Palakkad', coords: '10.7700,76.3770', washType: 'MANUAL', dailyVehicles: 16, currentSystem: 'NOTEBOOK', remarks: 'Too small for software right now.', interest: 'NOT_INTERESTED', status: 'LOST', collectedBy: 'Arjun Das', createdDaysAgo: 38, followUpInDays: null },
  { businessName: 'Malappuram Auto Shine', contactName: 'Noushad K', location: 'Kottakkal', district: 'Malappuram', coords: '11.0000,76.0000', washType: 'MULTI_SERVICE', dailyVehicles: 58, currentSystem: 'WHATSAPP', remarks: 'Wants automated WhatsApp service-due messages.', interest: 'HOT', status: 'CONTACTED', collectedBy: 'Sneha Raj', createdDaysAgo: 11, followUpInDays: -1, whatsappSame: true },
  { businessName: 'Manjeri Car Clinic', contactName: 'Abdul Salam', location: 'Manjeri', district: 'Malappuram', coords: '11.1200,76.1200', washType: 'DETAILING', dailyVehicles: 20, currentSystem: 'NONE', remarks: 'Asked for pricing sheet.', interest: 'COLD', status: 'CONTACTED', collectedBy: 'Sneha Raj', createdDaysAgo: 24, followUpInDays: 9 },
  { businessName: 'Calicut Car Spa', contactName: 'Jabir P', location: 'Mavoor Road', district: 'Kozhikode', coords: '11.2588,75.7804', washType: 'AUTOMATIC', dailyVehicles: 95, currentSystem: 'EXISTING_SOFTWARE', remarks: 'Evaluating switch; wants data migration help.', interest: 'WARM', status: 'DEMO_SCHEDULED', collectedBy: 'Rahul Nair', createdDaysAgo: 19, followUpInDays: 6 },
  { businessName: 'Beach Road Auto Wash', contactName: 'Shihab M', location: 'Beach Road', district: 'Kozhikode', coords: '11.2600,75.7700', washType: 'MANUAL', dailyVehicles: 32, currentSystem: 'NOTEBOOK', remarks: 'Interested in token system for waiting customers.', interest: 'HOT', status: 'NEW', collectedBy: 'Rahul Nair', createdDaysAgo: 1, followUpInDays: 0, whatsappSame: true },
  { businessName: 'Wayanad Green Wash', contactName: 'Jomon K', location: 'Kalpetta', district: 'Wayanad', coords: '11.6085,76.0830', washType: 'MANUAL', dailyVehicles: 14, currentSystem: 'NONE', remarks: 'Eco-friendly water recycling; wants usage tracking.', interest: 'WARM', status: 'NEW', collectedBy: 'Divya Menon', createdDaysAgo: 5, followUpInDays: 7 },
  { businessName: 'Kannur Car Care Centre', contactName: 'Pradeep V', location: 'Thavakkara', district: 'Kannur', coords: '11.8745,75.3704', washType: 'MULTI_SERVICE', dailyVehicles: 48, currentSystem: 'EXCEL', remarks: 'Owner wants monthly profit dashboard.', interest: 'HOT', status: 'DEMO_SCHEDULED', collectedBy: 'Divya Menon', createdDaysAgo: 8, followUpInDays: 2 },
  { businessName: 'Thalassery Shine', contactName: 'Rafeeq T', location: 'Thalassery', district: 'Kannur', coords: '11.7500,75.4900', washType: 'MANUAL', dailyVehicles: 26, currentSystem: 'WHATSAPP', remarks: 'Would like to see demo on phone.', interest: 'WARM', status: 'CONTACTED', collectedBy: 'Divya Menon', createdDaysAgo: 28, followUpInDays: -6 },
  { businessName: 'Kasaragod Auto Wash', contactName: 'Ibrahim B', location: 'Vidyanagar', district: 'Kasaragod', coords: '12.5000,75.0000', washType: 'MANUAL', dailyVehicles: 19, currentSystem: 'NOTEBOOK', remarks: 'Needs Kannada/Malayalam support on receipts.', interest: 'COLD', status: 'NEW', collectedBy: 'Arjun Das', createdDaysAgo: 4, followUpInDays: 14 },
  { businessName: 'Kovalam Beach Car Wash', contactName: 'Stephen D', location: 'Kovalam', district: 'Thiruvananthapuram', coords: '8.4004,76.9787', washType: 'MANUAL', dailyVehicles: 24, currentSystem: 'NONE', remarks: 'Tourist rentals; interested in fleet packages.', interest: 'WARM', status: 'NEW', collectedBy: 'Rahul Nair', createdDaysAgo: 0, followUpInDays: 3 },
  { businessName: 'Perumbavoor Pro Wash', contactName: 'Anoop Mohan', location: 'Perumbavoor', district: 'Ernakulam', coords: '10.1100,76.4800', washType: 'DETAILING', dailyVehicles: 22, currentSystem: 'EXCEL', remarks: 'Signed after second demo.', interest: 'HOT', status: 'CONVERTED', collectedBy: 'Sneha Raj', createdDaysAgo: 35, followUpInDays: null },
];

function dayOffset(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function mobileFor(i: number): string {
  // Deterministic, syntactically valid Indian mobile numbers (fictional).
  const prefixes = ['94', '95', '96', '97', '98', '99', '80', '81', '70', '62'];
  const p = prefixes[i % prefixes.length];
  return p + String(47000000 + i * 131713).slice(-8);
}

async function main() {
  await prisma.followUpNote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Lead_serialNo_seq" RESTART WITH 1');

  // Oldest first so serial numbers follow creation order.
  const ordered = [...leads].sort((a, b) => b.createdDaysAgo - a.createdDaysAgo);

  for (const [i, l] of ordered.entries()) {
    const created = dayOffset(-l.createdDaysAgo);
    created.setUTCHours(4 + (i % 8), (i * 7) % 60);
    const mobile = mobileFor(i + 1);
    const followUpDate = l.followUpInDays === null ? null : dayOffset(l.followUpInDays);

    const lead = await prisma.lead.create({
      data: {
        businessName: l.businessName,
        contactName: l.contactName,
        mobile,
        whatsapp: l.whatsappSame ? mobile : null,
        location: l.location,
        district: l.district,
        mapsLink: `https://maps.google.com/?q=${l.coords}`,
        washType: l.washType,
        dailyVehicles: l.dailyVehicles,
        currentSystem: l.currentSystem,
        remarks: l.remarks,
        interest: l.interest,
        status: l.status,
        collectedBy: l.collectedBy,
        followUpDate,
        createdAt: created,
      },
    });

    // Leads that progressed get a follow-up history.
    const history: { note: string; outcome: string; daysAfter: number }[] = [];
    if (l.status !== 'NEW') history.push({ note: 'Initial visit; discussed current process with owner.', outcome: 'Contacted', daysAfter: 1 });
    if (l.status === 'DEMO_SCHEDULED' || l.status === 'CONVERTED') history.push({ note: 'Phone call - agreed to see a product demo.', outcome: 'Demo scheduled', daysAfter: 4 });
    if (l.status === 'CONVERTED') history.push({ note: 'Demo done, pricing accepted. Onboarding started.', outcome: 'Converted', daysAfter: 9 });
    if (l.status === 'LOST') history.push({ note: 'Owner declined for now.', outcome: 'Lost', daysAfter: 5 });

    for (const h of history) {
      const at = new Date(created);
      at.setUTCDate(at.getUTCDate() + Math.min(h.daysAfter, l.createdDaysAgo));
      await prisma.followUpNote.create({
        data: { leadId: lead.id, note: h.note, outcome: h.outcome, completed: true, createdBy: l.collectedBy, createdAt: at },
      });
    }
  }

  console.log(`Seeded ${ordered.length} leads.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
