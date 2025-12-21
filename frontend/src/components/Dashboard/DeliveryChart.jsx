import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './DeliveryChart.css';

function DeliveryChart({ data, type }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // Function to handle window resize
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };
    
    if (chartRef.current && data) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      
      const isMobile = window.innerWidth <= 768;
      
      const options = {
        responsive: true,
        maintainAspectRatio: type === 'pie' ? true : false,
        aspectRatio: type === 'pie' ? 1.2 : undefined,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            position: type === 'pie' ? 'bottom' : 'top',
            labels: {
              usePointStyle: true,
              padding: isMobile ? 10 : 16,
              boxWidth: isMobile ? 12 : 14,
              boxHeight: isMobile ? 12 : 14,
              font: {
                size: isMobile ? 10 : 12,
                weight: 500
              },
              color: '#374151'
            },
            display: true,
            align: isMobile ? 'center' : 'start',
            fullSize: false
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
                size: 11
              },
              color: '#6b7280',
              padding: 8
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
                size: 11
              },
              color: '#6b7280',
              maxTicksLimit: 8,
              padding: 8
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
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        };
      } else if (type === 'pie') {
        options.elements = {
          arc: {
            borderWidth: 3,
            borderColor: '#ffffff'
          }
        };
        
        options.layout = {
          padding: {
            top: 15,
            bottom: 15,
            left: 15,
            right: 15
          }
        };
      }

      chartInstance.current = new Chart(ctx, {
        type: type,
        data: data,
        options: options
      });
      
      // Add resize listener after chart is created
      window.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
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