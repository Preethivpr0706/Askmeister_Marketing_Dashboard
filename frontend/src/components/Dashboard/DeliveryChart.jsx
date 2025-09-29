import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './DeliveryChart.css';

function DeliveryChart({ data, type }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && data) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            position: type === 'pie' ? 'bottom' : 'top',
            labels: {
              usePointStyle: true,
              padding: 12,
              boxWidth: 12,
              boxHeight: 12,
              font: {
                size: 11,
                weight: 500
              },
              color: '#374151'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1f2937',
            bodyColor: '#374151',
            borderColor: '#d1d5db',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 8,
            boxPadding: 4,
            usePointStyle: true,
            titleFont: {
              size: 12,
              weight: 600
            },
            bodyFont: {
              size: 11,
              weight: 500
            }
          }
        }
      };

      if (type === 'bar') {
        options.scales = {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 10
              },
              color: '#6b7280'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f3f4f6',
              lineWidth: 1
            },
            ticks: {
              font: {
                size: 10
              },
              color: '#6b7280',
              maxTicksLimit: 6
            }
          }
        };
        
        // Compact bar chart settings
        options.elements = {
          bar: {
            borderRadius: 4,
            borderWidth: 0
          }
        };
        
        options.layout = {
          padding: {
            top: 5,
            bottom: 5
          }
        };
      } else if (type === 'pie') {
        options.elements = {
          arc: {
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        };
        
        options.layout = {
          padding: {
            top: 5,
            bottom: 5,
            left: 5,
            right: 5
          }
        };
      }

      chartInstance.current = new Chart(ctx, {
        type: type,
        data: data,
        options: options
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type]);

  if (!data) {
    return (
      <div className="chart-loading">
        Loading chart data...
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}

export default DeliveryChart;