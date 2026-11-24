import { downloadTextFile } from '../downloadFile';

test('a text file is offered for download, and its address freed once the browser has taken it', () => {
  jest.useFakeTimers();
  const created: Blob[] = [];
  const create = jest.fn((blob: Blob) => { created.push(blob); return 'blob:menu'; });
  const revoke = jest.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('menus-semaine-2026-11-30.ics');
    expect(this.getAttribute('href')).toBe('blob:menu');
    expect(this.isConnected).toBe(true);
  });
  downloadTextFile('menus-semaine-2026-11-30.ics', 'BEGIN:VCALENDAR\r\n', 'text/calendar');
  expect(click).toHaveBeenCalledTimes(1);
  expect(created[0].type).toBe('text/calendar;charset=utf-8');
  expect(document.querySelector('a[download]')).toBeNull();
  // Safari cancels a download whose address is freed at once.
  expect(revoke).not.toHaveBeenCalled();
  jest.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:menu');
  click.mockRestore();
  jest.useRealTimers();
});
