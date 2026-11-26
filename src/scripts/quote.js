/* Quote page (prototype: validates only, this site sends and stores nothing). */
import { whatsappLink } from '../data/contact.js';
import { fill } from '../i18n/index.js';

const byId = (id) => document.getElementById(id);
// the page's language, written into the HTML
const copy = JSON.parse(byId('i18n').textContent);
const { errors } = copy;
const form = byId('quote-form');
const plateInput = byId('plate');
const idNumber = byId('id-number');
const noPlate = byId('no-plate');
const idType = byId('id-type');
const idKind = () => idType.value;

/* Returns the message to show, or '' when the value is fine. */
const rules = {
  plate: (v) => (/^[A-Z]{1,4}\s?\d{1,4}\s?[A-Z]{0,2}$/i.test(v) ? '' : errors.plate),
  idNumber: (v) => {
    const kind = idKind();
    const valid = {
      nric: /^\d{6}-\d{2}-\d{4}$/.test(v),
      passport: /^[A-Z0-9]{6,12}$/i.test(v),
      company: v.length >= 6,
    }[kind] ?? v.length >= 5;
    return valid ? '' : errors[kind];
  },
  name: (v) => (v.length >= 2 ? '' : errors[idKind() === 'company' ? 'companyName' : 'ownerName']),
  email: (v, input) => (v && input.validity.valid ? '' : errors.email),
  phone: (v) => (/^1\d{8,9}$/.test(v.replace(/[\s-]/g, '')) ? '' : errors.phone),
  postcode: (v) => (/^\d{5}$/.test(v) ? '' : errors.postcode),
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

let shownKind = 'nric';

const update = () => {
  const kind = idKind();
  const isCompany = kind === 'company';

  plateInput.disabled = noPlate.checked;
  plateInput.placeholder = noPlate.checked ? copy.plateNone : copy.plateExample;
  if (noPlate.checked) clear(plateInput);

  byId('name-label').textContent = isCompany ? copy.companyName : copy.ownerName;
  byId('name').placeholder = isCompany ? copy.companyExample : copy.ownerExample;
  byId('name').autocomplete = isCompany ? 'organization' : 'name';

  byId('id-label').textContent = copy.idLabels[kind];
  // the NCD note applies to people, not company registrations
  byId('id-help').hidden = isCompany;
  idNumber.placeholder = kind === 'nric' ? 'XXXXXX-XX-XXXX' : '';
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
  byId('chosen').textContent = fill(copy.chosen, { plan });
  byId('chosen').hidden = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const invalid = fields().filter((input) => !check(input));
  if (invalid.length) { invalid[0].focus(); return; }
  const done = byId('done');
  const email = byId('email').value.trim();
  const wantsWhatsApp = byId('by-whatsapp').checked;
  const whatsapp = byId('whatsapp');
  whatsapp.hidden = !wantsWhatsApp;
  if (wantsWhatsApp) {
    // only the plate and plan go into the message: never the ID number or other personal details
    whatsapp.href = whatsappLink([
      copy.message.hello,
      noPlate.checked ? copy.message.newCar : fill(copy.message.plate, { plate: plateInput.value.trim().toUpperCase() }),
      ...(byId('chosen').hidden ? [] : [byId('chosen').textContent]),
    ].join('\n'));
  }
  byId('done-text').textContent = wantsWhatsApp ? copy.doneWhatsApp : fill(copy.doneEmail, { email });
  form.hidden = true;
  done.hidden = false;
  done.focus();
});
