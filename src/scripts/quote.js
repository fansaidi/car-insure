/* Quote page (prototype: validates only, nothing is sent or stored). */
const byId = (id) => document.getElementById(id);
const form = byId('quote-form');
const plateInput = byId('plate');
const idNumber = byId('id-number');
const noPlate = byId('no-plate');
const idType = byId('id-type');
const idKind = () => idType.value;

/* Returns the message to show, or '' when the value is fine. */
const rules = {
  plate: (v) => (/^[A-Z]{1,4}\s?\d{1,4}\s?[A-Z]{0,2}$/i.test(v) ? '' : 'Enter a number plate, for example ABC1234.'),
  idNumber: (v) => {
    const kind = idKind();
    if (kind === 'nric') return /^\d{6}-\d{2}-\d{4}$/.test(v) ? '' : 'Enter all 12 digits of the NRIC.';
    if (kind === 'passport') return /^[A-Z0-9]{6,12}$/i.test(v) ? '' : 'Enter the passport number.';
    if (kind === 'company') return v.length >= 6 ? '' : 'Enter the business registration number.';
    return v.length >= 5 ? '' : `Enter the ${kind === 'police' ? 'police' : 'military'} IC number.`;
  },
  name: (v) => (v.length >= 2 ? '' : idKind() === 'company' ? 'Enter the company name.' : "Enter the owner's name."),
  email: (v, input) => (v && input.validity.valid ? '' : 'Enter an email like name@example.com.'),
  phone: (v) => (/^1\d{8,9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a mobile number like 12 345 6789.'),
  postcode: (v) => (/^\d{5}$/.test(v) ? '' : 'Enter a 5-digit postcode.'),
};

const ruleFor = (input) => rules[input.name];
const fields = () => [...form.querySelectorAll('input[required]:not(:disabled)')].filter(ruleFor);

const show = (input, message) => {
  const error = byId(`${input.id}-error`);
  error.textContent = message;
  error.hidden = !message;
  input.setAttribute('aria-invalid', String(Boolean(message)));
};
const check = (input) => {
  const message = ruleFor(input)(input.value.trim(), input);
  show(input, message);
  return !message;
};
const clear = (input) => { show(input, ''); input.removeAttribute('aria-invalid'); };

/* Check a field once the visitor leaves it, then keep an error up to date as they fix it. */
form.addEventListener('focusout', (e) => {
  const input = e.target;
  if (input.matches('input[required]') && ruleFor(input) && input.value.trim()) check(input);
});
form.addEventListener('input', (e) => {
  const input = e.target;
  if (input === idNumber && idKind() === 'nric') {
    const digits = input.value.replace(/\D/g, '').slice(0, 12);
    input.value = [digits.slice(0, 6), digits.slice(6, 8), digits.slice(8)].filter(Boolean).join('-');
  }
  if (input.getAttribute('aria-invalid') === 'true') check(input);
});

const ID_FIELDS = {
  nric: ["Vehicle owner's NRIC number", 'XXXXXX-XX-XXXX'],
  police: ['Police IC number', ''],
  army: ['Military IC number', ''],
  passport: ["Vehicle owner's passport number", ''],
  company: ['Business registration number', ''],
};
let shownKind = 'nric';

const update = () => {
  const kind = idKind();
  const isCompany = kind === 'company';

  plateInput.disabled = noPlate.checked;
  plateInput.placeholder = noPlate.checked ? 'No plate yet' : 'e.g. ABC1234';
  if (noPlate.checked) clear(plateInput);

  byId('name-label').textContent = isCompany ? 'Company name' : "Owner's name";
  byId('name').placeholder = isCompany ? 'Registered company name' : 'As on your ID';
  byId('name').autocomplete = isCompany ? 'organization' : 'name';

  const [label, placeholder] = ID_FIELDS[kind];
  byId('id-label').textContent = label;
  // the NCD note applies to people, not company registrations
  byId('id-help').hidden = isCompany;
  idNumber.placeholder = placeholder;
  idNumber.inputMode = kind === 'nric' ? 'numeric' : 'text';
  // a different kind of ID starts empty
  if (kind !== shownKind) { idNumber.value = ''; clear(idNumber); shownKind = kind; }
};

noPlate.addEventListener('change', update);
idType.addEventListener('change', update);
// browsers may restore choices when returning to the page
addEventListener('pageshow', update);

/* Values carried over from the home page: ?plate=ABC1234&plan=Plus */
const params = new URLSearchParams(location.search);
const plate = (params.get('plate') || '').trim().toUpperCase().slice(0, 12);
if (plate) plateInput.value = plate;
const plan = params.get('plan');
if (['Basic', 'Plus', 'Max'].includes(plan)) {
  byId('chosen').textContent = `Selected plan: ${plan}`;
  byId('chosen').hidden = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const invalid = fields().filter((input) => !check(input));
  if (invalid.length) { invalid[0].focus(); return; }
  const done = byId('done');
  byId('done-text').textContent = `This is a design prototype, so nothing was sent or saved. On a live site, the quote would go to ${byId('email').value.trim()}.`;
  form.hidden = true;
  done.hidden = false;
  done.focus();
});
