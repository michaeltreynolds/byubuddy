console.log("STARTING")
year_term = '20261'
year_term_int = parseInt(year_term)
// content-script.js
window.addEventListener('message', function(event) {
    if (event.source === window && event.data.type === 'BROWNIE_PIPELINE') {
    console.log('Received data from page:', event.data.payload);
    this.window.brownie = event.data.payload;
    // Process the data as needed
    }
});

// content-script.js
function injectScript(file_path, tag) {
    var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL(file_path));
    node.appendChild(script);
}

injectScript('content-injected.js', 'body');



async function fetchInstructorSchedule(brownie, year_term_int) {
  const response = await fetch("https://y.byu.edu/ry/ae/prod/class_schedule/cgi/instructorSchedule.cgi", {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    credentials: "include",
    body: `brownie=${brownie}&c=&e=&iid=223204922&year_term=${year_term_int}&parms=0&current=*&curriculum_id=&title_code=&my_section_number=&gradeSubmissionData=&lms=`
  });

  const html = await response.text();

  // Parse HTML into a document object
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Extract course info
  const classRows = Array.from(doc.querySelectorAll("table.application tr"))
    .filter(tr => tr.querySelector('a[title="View Class Roll"]'));

  const classes = classRows.map(tr => {
    const rollLink = tr.querySelector('a[title="View Class Roll"]');
    const href = rollLink.getAttribute("href");
    const match = href.match(/classRoll\('.*?','(\d+)','(\d+)','(\d+)'\)/);
    if (!match) return null;
    const [, classRollId, classNum, sectionNum] = match;

    const cells = tr.querySelectorAll("td");
    const prefix = cells[0]?.textContent.trim() ?? "";
    const catalog = cells[1]?.textContent.trim() ?? "";
    const friendlyName = `${prefix} ${catalog}`.trim();

    return { friendlyName, classRollId, classNum, sectionNum };
  }).filter(Boolean);

  console.table(classes);
  console.log("DDDDONE")
  return classes;
}
console.log(parent.window.brownie)
// Example usage:
window.setTimeout(()=>fetchInstructorSchedule(brownie, year_term_int), 1000);

async function getAddCodePdf(curriculum_id, title_code, section_number) {
  console.log("Get PDF");
  const response = await fetch("https://y.byu.edu/ry/ae/prod/class_schedule/cgi/printRoll.cgi", {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    credentials: "include",
    //"c=&e=%40loadToken&%26year_term%3D20261%26credit_institution%3DBYU+PROVO%26curriculum_id%3D14034%26title_code%3D001%26section_number%3D001%26",
    body: `&year_term=${year_term_int}&credit_institution=BYU PROVO&curriculum_id=${curriculum_id}&title_code=${title_code}&section_number=${section_number}&brownie=${brownie}`
    //body: `brownie=${brownie}&c=&e=&iid=223204922&year_term=${year_term_int}&parms=0&current=*&curriculum_id=&title_code=&my_section_number=&gradeSubmissionData=&lms=`
  });
  console.log(response)
  console.log("DONE PDF")

}

window.setTimeout(()=>getAddCodePdf("14034", "001", "001"), 1000);


console.log("DONE@")

async function extractPdfTextNoLib(pdfBuffer) {
  const pdf = new TextDecoder().decode(pdfBuffer);

  // 1. Find /Contents X 0 R reference
  const ref = pdf.match(/\/Contents\s+(\d+)\s+0\s+R/);
  if (!ref) return "";
  const objNum = ref[1];

  // 2. Extract stream bytes from the object
  const objRegex = new RegExp(
    objNum + "\\s+0\\s+obj[\\s\\S]*?stream[\\r\\n]+([\\s\\S]*?)endstream"
  );
  const m = pdf.match(objRegex);
  if (!m) return "";

  const rawStream = m[1];

  // Convert to binary bytes
  const bytes = new Uint8Array([...rawStream].map(c => c.charCodeAt(0)));

  // 3. Inflate using built-in deflate
  const inflated = await inflateRaw(bytes);

  // 4. Extract literal strings used by Tj/TJ
  return extractTextFromPdfStream(inflated);
}
