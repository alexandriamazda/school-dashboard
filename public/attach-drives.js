// Run this in the browser console at http://localhost:3000 to attach Drive links

const attachments = {
  "mkt-quiz1": [
    { name: "Chick-fil-A Case Study (PDF)", url: "https://drive.google.com/file/d/1A34VZGnwAPWethhlHvNY2PeTqzN_aJAq/view?usp=drivesdk" },
    { name: "Chapter 4 Slides", url: "https://docs.google.com/presentation/d/18XWIewqY3DAzAC_gF-7Va20Z8wZ9NvAB/edit?usp=drivesdk" },
  ],
  "mkt-exam1": [
    { name: "Exam 1 Questions (Doc)", url: "https://docs.google.com/document/d/1lKI1fiRjY3CVNijx2Q61ITsQnJ-zMunC/edit?usp=drivesdk" },
  ],
  "mkt-quiz2": [
    { name: "Quiz 2 Questions (PDF)", url: "https://drive.google.com/file/d/1Cw2EkpDQGeEtlTWHb-Prx35MuI8XnHqg/view?usp=drivesdk" },
    { name: "Chapter 9 Slides", url: "https://docs.google.com/presentation/d/1YA-mCVEhvnpUXaYZRTZFM0QXaiWNASNf/edit?usp=drivesdk" },
  ],
  "mkt-exam2": [
    { name: "Exam 2 Questions (Doc)", url: "https://docs.google.com/document/d/1DMp_8QgSN5c7LwoQcsaRspmjrkV_KrbC/edit?usp=drivesdk" },
  ],
  "mkt-pres1": [
    { name: "Marketing a New Restaurant Project", url: "https://docs.google.com/document/d/1LoWHPqDICziWYBT9JrS0eg2HwT39tv3K/edit?usp=drivesdk" },
  ],
  "mkt-pres2": [
    { name: "Marketing a New Restaurant Project", url: "https://docs.google.com/document/d/1LoWHPqDICziWYBT9JrS0eg2HwT39tv3K/edit?usp=drivesdk" },
  ],
  "mkt-pres3": [
    { name: "Marketing a New Restaurant Project", url: "https://docs.google.com/document/d/1LoWHPqDICziWYBT9JrS0eg2HwT39tv3K/edit?usp=drivesdk" },
  ],
};

const weekSlides = {
  "0908": { name: "Chapter 1 Slides", url: "https://docs.google.com/presentation/d/1fnUNGO6ccMtb1kGpyZa7nM1cy7MJkIyn/edit?usp=drivesdk" },
  "0910": { name: "Chapter 1 Slides", url: "https://docs.google.com/presentation/d/1fnUNGO6ccMtb1kGpyZa7nM1cy7MJkIyn/edit?usp=drivesdk" },
  "0915": { name: "Chapter 2 Slides", url: "https://docs.google.com/presentation/d/1LB15GAi36tNZGi2XSjbvu0y2uQ9V8swG/edit?usp=drivesdk" },
  "0917": { name: "Chapter 2 Slides", url: "https://docs.google.com/presentation/d/1LB15GAi36tNZGi2XSjbvu0y2uQ9V8swG/edit?usp=drivesdk" },
  "0922": { name: "Chapter 3 Slides", url: "https://docs.google.com/presentation/d/1Uivmr0HigucQBP27ioGYeZ_yazvooU70/edit?usp=drivesdk" },
  "0924": { name: "Chapter 3 Slides", url: "https://docs.google.com/presentation/d/1Uivmr0HigucQBP27ioGYeZ_yazvooU70/edit?usp=drivesdk" },
  "0929": { name: "Chapter 4 Slides", url: "https://docs.google.com/presentation/d/18XWIewqY3DAzAC_gF-7Va20Z8wZ9NvAB/edit?usp=drivesdk" },
  "1001": { name: "Chapter 4 Slides + Chick-fil-A Case", url: "https://docs.google.com/presentation/d/18XWIewqY3DAzAC_gF-7Va20Z8wZ9NvAB/edit?usp=drivesdk" },
  "1006": { name: "Chapter 5 Slides", url: "https://docs.google.com/presentation/d/1_qt_xMOZaY3b1kCa0q7D2oFdOCwbP57W/edit?usp=drivesdk" },
  "1008": { name: "Chapter 5 Slides", url: "https://docs.google.com/presentation/d/1_qt_xMOZaY3b1kCa0q7D2oFdOCwbP57W/edit?usp=drivesdk" },
  "1013": { name: "Chapter 7 Slides", url: "https://docs.google.com/presentation/d/1Sv6TuY4KAEo2s2uaINZovN4Phc2NPGoi/edit?usp=drivesdk" },
  "1015": { name: "Chapter 7 Slides", url: "https://docs.google.com/presentation/d/1Sv6TuY4KAEo2s2uaINZovN4Phc2NPGoi/edit?usp=drivesdk" },
  "1027": { name: "Chapter 18 Slides", url: "https://docs.google.com/presentation/d/1HFp7P8vivVqIsm5RH9Tite9daZG5clvs/edit?usp=drivesdk" },
  "1029": { name: "Chapter 18 Slides", url: "https://docs.google.com/presentation/d/1HFp7P8vivVqIsm5RH9Tite9daZG5clvs/edit?usp=drivesdk" },
  "1103": { name: "Chapter 14-15 Slides", url: "https://docs.google.com/presentation/d/1KaMHcuW70WpT5W_kLxzwdpCzUnAEvMuQ/edit?usp=drivesdk" },
  "1105": { name: "Chapter 14-15 Slides", url: "https://docs.google.com/presentation/d/1KaMHcuW70WpT5W_kLxzwdpCzUnAEvMuQ/edit?usp=drivesdk" },
  "1110": { name: "Chapter 17 Slides", url: "https://docs.google.com/presentation/d/1PFNz5tcnoC3XY7WeTH_fkmHAMsyoemxK/edit?usp=drivesdk" },
  "1112": { name: "Chapter 17 Slides", url: "https://docs.google.com/presentation/d/1PFNz5tcnoC3XY7WeTH_fkmHAMsyoemxK/edit?usp=drivesdk" },
  "1117": { name: "Chapter 9 Slides", url: "https://docs.google.com/presentation/d/1YA-mCVEhvnpUXaYZRTZFM0QXaiWNASNf/edit?usp=drivesdk" },
  "1119": { name: "Chapter 9 Slides", url: "https://docs.google.com/presentation/d/1YA-mCVEhvnpUXaYZRTZFM0QXaiWNASNf/edit?usp=drivesdk" },
  "1124": { name: "Chapter 10-11 Slides", url: "https://docs.google.com/presentation/d/1_aeLTcOAJjmnAPDwirDR5_EoU1KFaV__/edit?usp=drivesdk" },
};

let events = JSON.parse(localStorage.getItem('alex_events') || '[]');
let updated = 0;

events = events.map(e => {
  // Match by known ID
  if (attachments[e.id]) {
    e.attachments = attachments[e.id];
    updated++;
    return e;
  }
  // Match class sessions by date (MMDD from date string)
  if (e.type === 'class' && e.date) {
    const mmdd = e.date.slice(5,7) + e.date.slice(8,10);
    if (weekSlides[mmdd]) {
      e.attachments = [weekSlides[mmdd]];
      updated++;
    }
  }
  return e;
});

localStorage.setItem('alex_events', JSON.stringify(events));
console.log(`✅ Updated ${updated} events with Drive links`);
