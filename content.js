alert("STARTING")
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
  alert("DDDDONE")
  return classes;
}
alert(parent.window.brownie)
// Example usage:
window.setTimeout(()=>fetchInstructorSchedule(brownie, year_term_int), 1000);

alert("DONE@")