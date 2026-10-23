import { describe, it, expect } from 'vitest';
import { Chart, Series, ArgumentAxis, ValueAxis, Legend, Tooltip, Label, Grid, parseChart, tooltipLines } from '../chart';
import { PieChart, Series as PieSeries, Label as PieLabel, Connector } from '../pie-chart';

describe('parseChart', () => {
  it('collects series (including nested labels), axes, legend and tooltip from children', () => {
    const fmt = (e) => `${e.valueText}!`;
    const spec = parseChart(
      <Chart rotated palette={['#111', '#222']}>
        <ArgumentAxis><Grid visible={false} /></ArgumentAxis>
        <ValueAxis name="left" position="left" />
        <ValueAxis name="right" position="right" title="secs" />
        <Series valueField="a" argumentField="day" type="bar" axis="left" cornerRadius={3}>
          <Label visible position="outside" customizeText={fmt} />
        </Series>
        {['b', 'c'].map((f) => <Series key={f} valueField={f} argumentField="day" type="spline" />)}
        {false}
        <Legend visible={false} />
        <Tooltip enabled customizeTooltip={() => ({ text: 'x' })} />
      </Chart>,
    );
    expect(spec.series.map((s) => s.valueField)).toEqual(['a', 'b', 'c']);
    expect(spec.series[0].label.customizeText).toBe(fmt);
    expect(spec.series[0].color).toBe('#111');
    expect(spec.series[1].color).toBe('#222');
    expect(spec.valueAxes.map((a) => a.name)).toEqual(['left', 'right']);
    expect(spec.argumentField).toBe('day');
    expect(spec.legend.visible).toBe(false);
    expect(spec.tooltip.enabled).toBe(true);
    expect(spec.rotated).toBe(true);
  });

  it('works for pie charts with their own marker module', () => {
    const spec = parseChart(
      <PieChart type="doughnut" palette={['#a']}>
        <PieSeries argumentField="label" valueField="count">
          <PieLabel visible position="outside"><Connector visible /></PieLabel>
        </PieSeries>
      </PieChart>,
    );
    expect(spec.series[0].valueField).toBe('count');
    expect(spec.series[0].label.visible).toBe(true);
    expect(spec.argumentField).toBe('label');
  });
});

describe('tooltipLines', () => {
  it('turns DevExtreme tooltip markup into safe text lines, keeping bold', () => {
    expect(tooltipLines('<b>Mobile</b><br/>12 responses (40.0%)')).toEqual([
      { text: 'Mobile', bold: true },
      { text: '12 responses (40.0%)', bold: false },
    ]);
  });

  it('never passes through other HTML', () => {
    expect(tooltipLines('<img src=x onerror=alert(1)>hi')).toEqual([{ text: 'hi', bold: false }]);
  });
});
