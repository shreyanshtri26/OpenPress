import React from 'react';
import { Chart, Series, ArgumentAxis, ValueAxis, Legend, Margin, Tooltip, Grid } from '@/components/ui/dx/chart';

export default function AudienceInsightsChart({ data }) {
    return (
        <Chart id="chart" dataSource={data} height={300}>
            <Series
                valueField="value"
                argumentField="date"
                name="Insights"
                type="spline"
                color="#111827"
                width={1.5}
            />
            <Margin bottom={0} />
            <ArgumentAxis valueMarginsEnabled={false}>
                <Grid visible={false} />
            </ArgumentAxis>
            <ValueAxis visible={true}>
                <Grid visible={false} />
            </ValueAxis>
            <Legend visible={false} />
            <Tooltip enabled={true} />
        </Chart>
    );
}
