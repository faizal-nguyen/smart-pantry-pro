/**
 * V11-06 E2b — form dialogs of the lot rise from the bottom of the visible area under 900 px and
 * follow the keyboard (PRP V11-06, sections 6 and 14), on the bench:
 * - at 390 and 899 px, the dialog spans the width and sits on the bottom edge. With the keyboard
 *   « open » (the visible area reduced to 450 px, as `visualViewport` reports it), its bottom rises to
 *   450 px and the field and its submit button stay above. Escape and « Fermer » close it and give
 *   the focus back to the button that opened it;
 * - at 900 and 1440 px, it stays centred.
 * The memory correction needs fictional memories: the bench's own control loads them, outside the
 * `carnet` scene that hides its controls.
 * The keyboard is simulated: desktop Chromium has no virtual keyboard. Geometry only, no screenshot.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const BENCH = '/scripts/fixtures/v10/index.html?scene=carnet&still=1';
const BENCH_WITH_CONTROLS = '/scripts/fixtures/v10/index.html?still=1';
const NOW = new Date('2026-11-25T10:00:00+01:00');
const KEYBOARD_VISIBLE_PX = 450;
const viewportHeight = (width: number) => (width < 900 ? 844 : 900);
/** Rounding of sub-pixel layout. */
const TOLERANCE_PX = 2;
/** `max-w-lg` of the centred dialog. */
const CENTRED_MAX_PX = 512;

interface FormDialog {
  name: string;
  bench: string;
  route: string;
  prepare?: (page: Page) => Promise<void>;
  title: string;
  trigger: (page: Page) => Locator;
  field: (dialog: Locator) => Locator;
  submit: (dialog: Locator) => Locator;
}

const FORMS: FormDialog[] = [
  {
    name: 'aide de l’en-tête',
    bench: BENCH,
    route: '/shopping/list',
    title: 'Aide pour cette tâche',
    trigger: page => page.getByRole('button', { name: 'Aide', exact: true }),
    field: dialog => dialog.getByRole('textbox'),
    submit: dialog => dialog.getByRole('button', { name: 'Demander' }),
  },
  {
    name: 'correction d’un souvenir',
    bench: BENCH_WITH_CONTROLS,
    route: '/settings?section=assistant-memory',
    prepare: async page => {
      await page.getByText('Test local — données fictives · contrôles').click();
      await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Charger les souvenirs fictifs' }).click()]);
    },
    title: 'Corriger ce souvenir',
    trigger: page => page.getByRole('button', { name: 'Corriger' }).first(),
    field: dialog => dialog.getByRole('textbox'),
    submit: dialog => dialog.getByRole('button', { name: 'Enregistrer la correction' }),
  },
];

async function open(page: Page, form: FormDialog, width: number): Promise<Locator> {
  await page.setViewportSize({ width, height: viewportHeight(width) });
  await page.clock.setFixedTime(NOW);
  await page.goto(`${form.bench}&route=${encodeURIComponent(form.route)}`);
  await form.prepare?.(page);
  await form.trigger(page).click();
  const dialog = page.getByRole('dialog', { name: form.title });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function box(locator: Locator) {
  const measured = await locator.boundingBox();
  if (!measured) throw new Error('élément sans boîte');
  return { left: measured.x, top: measured.y, right: measured.x + measured.width, bottom: measured.y + measured.height, width: measured.width };
}

const near = (value: number, target: number) => Math.abs(value - target) <= TOLERANCE_PX;

/** What the provider writes when `visualViewport` shrinks above the keyboard. */
function setVisibleHeight(page: Page, height: number) {
  return page.evaluate(value => document.documentElement.style.setProperty('--routine-viewport-height', `${value}px`), height);
}

for (const form of FORMS) {
  for (const width of [390, 899]) {
    test(`${form.name}, ${width} px : présentation basse qui suit le clavier`, async ({ page }) => {
      const dialog = await open(page, form, width);
      await expect.poll(async () => {
        const sheet = await box(dialog);
        return near(sheet.left, 0) && near(sheet.width, width) && near(sheet.bottom, viewportHeight(width)) ? 'en bas' : JSON.stringify(sheet);
      }).toBe('en bas');

      await setVisibleHeight(page, KEYBOARD_VISIBLE_PX);
      await form.field(dialog).focus();
      await expect.poll(async () => {
        const sheet = await box(dialog);
        const field = await box(form.field(dialog));
        const submit = await box(form.submit(dialog));
        const above = near(sheet.bottom, KEYBOARD_VISIBLE_PX) && field.top >= 0 && submit.bottom <= KEYBOARD_VISIBLE_PX + TOLERANCE_PX;
        return above ? 'au-dessus du clavier' : JSON.stringify({ sheet, field, submit });
      }).toBe('au-dessus du clavier');

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(form.trigger(page)).toBeFocused();

      await setVisibleHeight(page, viewportHeight(width));
      await form.trigger(page).click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Fermer' }).click();
      await expect(dialog).toBeHidden();
      await expect(form.trigger(page)).toBeFocused();
    });
  }

  for (const width of [900, 1440]) {
    test(`${form.name}, ${width} px : dialogue centré`, async ({ page }) => {
      const dialog = await open(page, form, width);
      await expect.poll(async () => {
        const centred = await box(dialog);
        return near(centred.left, width - centred.right) && centred.width <= CENTRED_MAX_PX + TOLERANCE_PX ? 'centré' : JSON.stringify(centred);
      }).toBe('centré');
    });
  }
}
