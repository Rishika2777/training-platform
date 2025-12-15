/**
 * App Management Controller
 * Handles app analytics and management
 */
angular.module('campusApp.admin').controller('AppManagementController', [
    '$scope',
    '$timeout',
    function ($scope, $timeout) {
        $scope.loading = false;
        $scope.filters = { year: '2024' };

        $scope.lineChart = {
            viewBox: '0 0 640 240',
            gridLines: [],
            polylinePoints: '',
            points: [],
            xLabels: []
        };

        $scope.barChart = {
            viewBox: '0 0 640 240',
            gridLines: [],
            bars: [],
            xLabels: []
        };

        $scope.pieChart = {
            viewBox: '0 0 320 240',
            segments: [],
            labels: [],
            legend: []
        };

        function clampNumber(value, min, max) {
            if (value < min) {
                return min;
            }
            if (value > max) {
                return max;
            }
            return value;
        }

        function round1(value) {
            return Math.round(value * 10) / 10;
        }

        function buildGridLines(opts) {
            const lines = [];
            const steps = opts.steps;
            const yTop = opts.yTop;
            const yBottom = opts.yBottom;
            const xLeft = opts.xLeft;
            const xRight = opts.xRight;
            const stepY = (yBottom - yTop) / steps;

            for (let i = 0; i <= steps; i += 1) {
                const y = round1(yTop + stepY * i);
                lines.push({ x1: xLeft, y1: y, x2: xRight, y2: y });
            }

            return lines;
        }

        function buildMonthLabels(months, xLeft, xRight, y) {
            const labels = [];
            const count = months.length;
            const stepX = (xRight - xLeft) / (count - 1);

            for (let i = 0; i < count; i += 1) {
                labels.push({
                    text: months[i],
                    x: round1(xLeft + stepX * i),
                    y
                });
            }

            return labels;
        }

        function scaleSeriesToPoints(series, xLeft, xRight, yTop, yBottom) {
            const count = series.length;
            const stepX = (xRight - xLeft) / (count - 1);
            const minVal = 0;
            const maxVal = 100;
            const points = [];

            for (let i = 0; i < count; i += 1) {
                const v = clampNumber(series[i], minVal, maxVal);
                const t = maxVal === minVal ? 0 : (v - minVal) / (maxVal - minVal);
                const x = round1(xLeft + stepX * i);
                const y = round1(yBottom - (yBottom - yTop) * t);
                points.push({ x, y, v });
            }

            return points;
        }

        function pointsToPolyline(points) {
            return points.map(p => `${p.x},${p.y}`).join(' ');
        }

        function buildLineChart(months, series) {
            const xLeft = 40;
            const xRight = 620;
            const yTop = 20;
            const yBottom = 200;

            const points = scaleSeriesToPoints(series, xLeft, xRight, yTop, yBottom).map(p => ({
                x: p.x,
                y: p.y,
                r: 3
            }));

            $scope.lineChart.gridLines = buildGridLines({
                steps: 5,
                yTop,
                yBottom,
                xLeft,
                xRight
            });
            $scope.lineChart.points = points;
            $scope.lineChart.polylinePoints = pointsToPolyline(points);
            $scope.lineChart.xLabels = buildMonthLabels(months, xLeft, xRight, 230);
        }

        function buildBarChart(months, series) {
            const xLeft = 40;
            const xRight = 620;
            const yTop = 20;
            const yBottom = 200;

            const count = series.length;
            const slot = (xRight - xLeft) / count;
            const barW = slot * 0.62;
            const minVal = 0;
            const maxVal = 100;
            const bars = [];

            for (let i = 0; i < count; i += 1) {
                const v = clampNumber(series[i], minVal, maxVal);
                const t = maxVal === minVal ? 0 : (v - minVal) / (maxVal - minVal);
                const h = round1((yBottom - yTop) * t);
                const x = round1(xLeft + slot * i + (slot - barW) / 2);
                const y = round1(yBottom - h);
                bars.push({ x, y, w: round1(barW), h, rx: 3 });
            }

            $scope.barChart.gridLines = buildGridLines({
                steps: 5,
                yTop,
                yBottom,
                xLeft,
                xRight
            });
            $scope.barChart.bars = bars;
            $scope.barChart.xLabels = buildMonthLabels(
                months,
                xLeft + slot / 2,
                xRight - slot / 2,
                230
            );
        }

        function polarToCartesian(cx, cy, r, angleRad) {
            return {
                x: round1(cx + r * Math.cos(angleRad)),
                y: round1(cy + r * Math.sin(angleRad))
            };
        }

        function buildPiePath(cx, cy, r, startAngle, endAngle) {
            const start = polarToCartesian(cx, cy, r, startAngle);
            const end = polarToCartesian(cx, cy, r, endAngle);
            const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
            return [
                `M ${cx} ${cy}`,
                `L ${start.x} ${start.y}`,
                `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
                'Z'
            ].join(' ');
        }

        function buildPieChart(items) {
            const cx = 120;
            const cy = 120;
            const r = 90;
            const total = items.reduce((sum, it) => sum + it.value, 0) || 1;
            const segments = [];
            const labels = [];
            const legend = [];

            let acc = -Math.PI / 2; // start at top
            for (let i = 0; i < items.length; i += 1) {
                const it = items[i];
                const portion = it.value / total;
                const ang = portion * Math.PI * 2;
                const start = acc;
                const end = acc + ang;

                segments.push({
                    d: buildPiePath(cx, cy, r, start, end),
                    color: it.color
                });

                const mid = (start + end) / 2;
                const labelPos = polarToCartesian(cx, cy, r * 0.55, mid);
                labels.push({
                    x: labelPos.x,
                    y: labelPos.y,
                    text: `${it.label} ${it.value}`
                });

                legend.push({ label: it.label, color: it.color });
                acc = end;
            }

            $scope.pieChart.segments = segments;
            $scope.pieChart.labels = labels;
            $scope.pieChart.legend = legend;
        }

        function getStaticDataForYear(year) {
            const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec'
            ];

            const dataByYear = {
                2024: {
                    engagement: [82, 25, 88, 82, 56, 90, 35, 96, 54, 74, 23, 18],
                    placements: [86, 48, 79, 68, 54, 22, 88, 47, 51, 66, 36, 84],
                    entities: [
                        { label: 'Campus', value: 106.88, color: '#6E8A8E' },
                        { label: 'Students', value: 239.03, color: '#38C1D9' },
                        { label: 'Company', value: 152.05, color: '#FF8C87' }
                    ]
                },
                2023: {
                    engagement: [70, 40, 75, 68, 62, 80, 55, 84, 48, 60, 30, 28],
                    placements: [60, 45, 64, 50, 40, 18, 70, 32, 46, 55, 28, 66],
                    entities: [
                        { label: 'Campus', value: 92.4, color: '#6E8A8E' },
                        { label: 'Students', value: 210.1, color: '#38C1D9' },
                        { label: 'Company', value: 141.6, color: '#FF8C87' }
                    ]
                },
                2022: {
                    engagement: [58, 36, 60, 52, 45, 66, 40, 72, 38, 46, 22, 20],
                    placements: [42, 30, 48, 36, 28, 12, 54, 26, 30, 40, 18, 50],
                    entities: [
                        { label: 'Campus', value: 78.2, color: '#6E8A8E' },
                        { label: 'Students', value: 180.5, color: '#38C1D9' },
                        { label: 'Company', value: 120.9, color: '#FF8C87' }
                    ]
                }
            };

            const d = dataByYear[String(year)] || dataByYear['2024'];
            return {
                months,
                engagement: d.engagement,
                placements: d.placements,
                entities: d.entities
            };
        }

        function renderAllCharts() {
            const year = $scope.filters.year;
            const d = getStaticDataForYear(year);
            buildLineChart(d.months, d.engagement);
            buildBarChart(d.months, d.placements);
            buildPieChart(d.entities);
        }

        $scope.onYearChange = function () {
            renderAllCharts();
        };

        function init() {
            // ensure bindings exist before first paint
            $timeout(function () {
                renderAllCharts();
            }, 0);
        }

        init();
    }
]);