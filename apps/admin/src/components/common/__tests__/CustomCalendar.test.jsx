import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CustomCalendar from '../CustomCalendar';

afterEach(cleanup);

describe('CustomCalendar (free DateBox wrapper)', () => {
  it('uses a date+time input when the time header is on, date-only when off', () => {
    const { rerender } = render(<CustomCalendar placeholder="when" onValueChanged={() => {}} />);
    expect(screen.getByPlaceholderText('when').type).toBe('datetime-local');
    rerender(<CustomCalendar placeholder="when" showTimeHeader={false} onValueChanged={() => {}} />);
    expect(screen.getByPlaceholderText('when').type).toBe('date');
  });

  it('blocks past dates by default via min', () => {
    render(<CustomCalendar placeholder="when" showTimeHeader={false} onValueChanged={() => {}} />);
    const t = new Date();
    const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    expect(screen.getByPlaceholderText('when').min).toBe(today);
  });

  it('refuses a date that disabledDates rejects', () => {
    const onValueChanged = vi.fn();
    render(
      <CustomCalendar
        placeholder="when"
        showTimeHeader={false}
        disablePastDates={false}
        disabledDates={({ date }) => date.getDate() === 13}
        onValueChanged={onValueChanged}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('when'), { target: { value: '2030-01-13' } });
    expect(onValueChanged).not.toHaveBeenCalled();
    expect(screen.getByText('That date is not available')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('when'), { target: { value: '2030-01-14' } });
    expect(onValueChanged.mock.calls[0][0].value.getDate()).toBe(14);
  });

  it('passes picks through resolveValue (adjust or refuse)', () => {
    const onValueChanged = vi.fn();
    const resolveValue = vi.fn((d) => (d.getHours() < 9 ? null : new Date(d.getTime() + 60_000)));
    render(<CustomCalendar placeholder="when" disablePastDates={false} resolveValue={resolveValue} onValueChanged={onValueChanged} />);
    fireEvent.change(screen.getByPlaceholderText('when'), { target: { value: '2030-01-14T08:00' } });
    expect(onValueChanged).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('when'), { target: { value: '2030-01-14T10:00' } });
    expect(onValueChanged.mock.calls[0][0].value.getMinutes()).toBe(1);
  });

  it('emits null when cleared', () => {
    const onValueChanged = vi.fn();
    render(<CustomCalendar placeholder="when" showTimeHeader={false} value={new Date(2030, 0, 2)} disablePastDates={false} onValueChanged={onValueChanged} />);
    fireEvent.change(screen.getByPlaceholderText('when'), { target: { value: '' } });
    expect(onValueChanged.mock.calls[0][0].value).toBe(null);
  });
});
