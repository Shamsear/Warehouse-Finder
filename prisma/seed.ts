import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

// Sample warehouses for testing the dashboard before live scraping
const sampleWarehouses = [
  { name: "Jebel Ali Free Zone Authority", address: "JAFZA, Dubai", city: "Dubai", country: "UAE", freeZone: "JAFZA", phone: "+971 4 883 1111", email: null, website: "https://www.jafza.ae", source: "sample" },
  { name: "DP World Logistics", address: "Jebel Ali, Dubai", city: "Dubai", country: "UAE", freeZone: "JAFZA", phone: "+971 4 808 7000", email: null, website: "https://www.dpworld.com", source: "sample" },
  { name: "Emirates Logistics", address: "Al Quoz, Dubai", city: "Dubai", country: "UAE", freeZone: null, phone: "+971 4 339 4400", email: null, website: null, source: "sample" },
  { name: "Aramex Warehouse", address: "Dubai Logistics City", city: "Dubai", country: "UAE", freeZone: "Dubai South", phone: "+971 4 601 0000", email: null, website: "https://www.aramex.com", source: "sample" },
  { name: "Fetchr Logistics", address: "Dubai South", city: "Dubai", country: "UAE", freeZone: "Dubai South", phone: "+971 4 887 9900", email: null, website: null, source: "sample" },
  { name: "Shipa Delivery", address: "Dubai, UAE", city: "Dubai", country: "UAE", freeZone: null, phone: "+971 4 568 9900", email: null, website: "https://www.shipa.com", source: "sample" },
  { name: "Trukker Technologies", address: "Dubai, UAE", city: "Dubai", country: "UAE", freeZone: null, phone: "+971 4 887 5500", email: null, website: null, source: "sample" },
  { name: "Camilia Trading", address: "JAFZA, Dubai", city: "Dubai", country: "UAE", freeZone: "JAFZA", phone: "+971 4 880 3300", email: null, website: null, source: "sample" },
  { name: "Al Majed Group", address: "Deira, Dubai", city: "Dubai", country: "UAE", freeZone: null, phone: "+971 4 226 1111", email: null, website: null, source: "sample" },
  { name: "RSA Global Logistics", address: "Dubai Investment Park", city: "Dubai", country: "UAE", freeZone: null, phone: "+971 4 815 9900", email: null, website: "https://www.rsaglobal.net", source: "sample" },
  { name: "National Store", address: "Al Quoz Industrial Area", city: "Dubai", country: "UAE", freeZone: null, phone: "+971 4 338 7700", email: null, website: null, source: "sample" },
  { name: "Gulf Warehousing Company", address: "JAFZA, Dubai", city: "Dubai", country: "UAE", freeZone: "JAFZA", phone: "+971 4 883 5555", email: null, website: null, source: "sample" },
  { name: "Khalifa Industrial Zone (KIZAD)", address: "KIZAD, Abu Dhabi", city: "Abu Dhabi", country: "UAE", freeZone: "KIZAD", phone: "+971 2 693 4444", email: null, website: "https://www.kizad.ae", source: "sample" },
  { name: "Abu Dhabi Ports Company", address: "Zayed Port, Abu Dhabi", city: "Abu Dhabi", country: "UAE", freeZone: null, phone: "+971 2 693 4444", email: null, website: "https://www.adports.ae", source: "sample" },
  { name: "ADNOC Logistics", address: "Abu Dhabi, UAE", city: "Abu Dhabi", country: "UAE", freeZone: null, phone: "+971 2 603 7000", email: null, website: "https://www.adnocdistribution.ae", source: "sample" },
  { name: "Emirates Steel Arkan", address: "ICAD, Abu Dhabi", city: "Abu Dhabi", country: "UAE", freeZone: "KIZAD", phone: "+971 2 810 9000", email: null, website: null, source: "sample" },
  { name: "Sharjah Logistics Zone", address: "Sharjah, UAE", city: "Sharjah", country: "UAE", freeZone: null, phone: "+971 6 528 8888", email: null, website: null, source: "sample" },
  { name: "Saif Zone Warehouse", address: "Sharjah Airport International Free Zone", city: "Sharjah", country: "UAE", freeZone: null, phone: "+971 6 557 1111", email: null, website: "https://www.saifzone.com", source: "sample" },
  { name: "Ras Bufontas Free Zone", address: "Ras Bufontas, Doha", city: "Doha", country: "Qatar", freeZone: "Ras Bufontas", phone: "+974 4408 8888", email: null, website: null, source: "sample" },
  { name: "Umm Al Houl Free Zone", address: "Umm Al Houl, Qatar", city: "Al Wakrah", country: "Qatar", freeZone: "Umm Al Houl", phone: "+974 4448 8888", email: null, website: null, source: "sample" },
  { name: "Qatar Airways Cargo", address: "Doha, Qatar", city: "Doha", country: "Qatar", freeZone: null, phone: "+974 4022 7777", email: null, website: "https://www.qatarairways.com", source: "sample" },
  { name: "Milaha Logistics", address: "Doha, Qatar", city: "Doha", country: "Qatar", freeZone: null, phone: "+974 4449 6000", email: null, website: "https://www.milaha.com", source: "sample" },
  { name: "GWC (Gulf Warehousing Company Qatar)", address: "Doha, Qatar", city: "Doha", country: "Qatar", freeZone: null, phone: "+974 4408 8800", email: null, website: "https://www.gwcqatar.com", source: "sample" },
  { name: "Al Jazeera Logistics", address: "Mesaieed, Qatar", city: "Mesaieed", country: "Qatar", freeZone: null, phone: "+974 4473 5500", email: null, website: null, source: "sample" },
];

async function main() {
  console.log("🌱 Seeding database with sample warehouses...");

  let created = 0;
  for (const w of sampleWarehouses) {
    try {
      await prisma.warehouse.create({
        data: {
          name: w.name,
          address: w.address,
          city: w.city,
          country: w.country,
          freeZone: w.freeZone,
          phone: w.phone,
          email: w.email,
          website: w.website,
          source: w.source,
          tags: [],
        },
      });
      created++;
    } catch (e) {
      // Skip duplicates
    }
  }

  // Create default message templates one by one (createMany had permission issues)
  const templates = [
    {
      name: "Intro Pitch",
      body: "Hi {{name}},\n\nWe're building ERP solutions specifically designed for warehouses in {{city}}. Our platform helps streamline inventory management, order processing, and logistics operations.\n\nWould you be open to a quick 5-minute call this week to see how we can help your business?\n\nBest regards",
    },
    {
      name: "Value Proposition",
      body: "Hi {{name}},\n\nOur ERP platform helps warehouses like yours save up to 30% on operational costs through:\n\n✅ Real-time inventory tracking\n✅ Automated order processing\n✅ Logistics & delivery management\n✅ Financial reporting & analytics\n\nCan I send you a quick demo? It takes just 5 minutes.",
    },
    {
      name: "Follow Up",
      body: "Hi {{name}},\n\nJust following up on my earlier message about warehouse ERP solutions. I understand you're busy — happy to schedule a call at your convenience.\n\nWould any day this week work for a quick chat?",
    },
    {
      name: "UAE Specific",
      body: "Hi {{name}},\n\nWe're working with warehouses across {{city}}, UAE to modernize their operations with our ERP platform.\n\nWith features built for the UAE logistics market — including Arabic support, multi-currency, and free zone compliance — we'd love to show you how {{name}} can benefit.\n\nQuick 10-min demo this week?",
    },
  ];

  let templatesCreated = 0;
  for (const t of templates) {
    try {
      await prisma.messageTemplate.create({ data: t });
      templatesCreated++;
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`✅ Seeded ${created} warehouses and ${templatesCreated} message templates`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
