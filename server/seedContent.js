import { contact, news, jobs } from "../src/data/pages.js";

export default {
  site: {
    phone: "+02 10 0123 4567",
    companyAddress: "90 North Street, Block No.181, Fifth Settlement, New Cairo, Egypt",
    factoryAddress: "10th of Ramadan city industries area, zone B3 Plot 10, Egypt.",
    copyright: "© 2026 EGYLUX. All rights reserved",
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  },
  home: {
    heroTitle: "WE LIGHT YOUR LIFE",
    heroCta: "Get Quotation",
    aboutTitle: "About Us",
    aboutText:
      "EGYLUX was established in 1996 as an Egyptian provider of the latest lighting solutions for residential, industrial, commercial and outdoor purposes with a strong presence in the Egyptian Market and the MENA region. EGYLUX offers wide range of products but the main focus is on LED floodlight, high bay light, streetlight, wall pack and panel light.",
    aboutBtn: "Learn More",
    ctaTitle: "Bring Your Vision To Life",
    ctaBtn: "Contact Us",
  },
  contact: { offices: contact.offices },
  news: { title: "Our News", image: news.image, list: news.list },
  careers: { title: "Careers", image: jobs.image, list: jobs.list },
};
