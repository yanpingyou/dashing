/*
 * Licensed under the Apache License, Version 2.0
 * See accompanying LICENSE file.
 */
angular.module('dashing.charts.echarts', [
  'dashing.util'
])
/**
 * Make DIV becoming an echart control.
 *
 * Recommend use `<echart options="::YourOptions"></echart>`, because the options will not accept new changes
 * anyway after the directive is stabilized.
 */
  .directive('echart', function() {
    'use strict';

    function makeDataArray(data, dataPointsGrowNum, xAxisTypeIsTime) {
      function ensureArray(obj) {
        return Array.isArray(obj) ? obj : [obj];
      }

      var array = [];
      angular.forEach(ensureArray(data), function(datum) {
        var dataGrow = dataPointsGrowNum-- > 0;
        var yValues = ensureArray(datum.y);
        if (xAxisTypeIsTime) {
          angular.forEach(yValues, function(yValue, seriesIndex) {
            var params = [seriesIndex, [datum.x, yValue], /*isHead=*/false, dataGrow];
            array.push(params);
          });
        } else {
          var lastSeriesIndex = yValues.length - 1;
          angular.forEach(yValues, function(yValue, seriesIndex) {
            var params = [seriesIndex, yValue, /*isHead=*/false, dataGrow];
            if (seriesIndex === lastSeriesIndex) {
              // x-axis label (for category type) must be added to the last series!
              params.push(datum.x);
            }
            array.push(params);
          });
        }
      });
      return array;
    }

    return {
      restrict: 'E',
      template: '<div></div>',
      replace: true /* tag will be replaced as div, otherwise echart cannot find a container to stay. */,
      scope: {
        options: '='
      },
      controller: ['$scope', '$element', 'dsEchartsDefaults', '$echarts',
        function($scope, $element, defaults, $echarts) {
          var options = $scope.options;
          var elem0 = $element[0];
          angular.forEach(['width', 'height'], function(prop) {
            if (options[prop]) {
              elem0.style[prop] = options[prop];
            }
          });
          var chart = echarts.init(elem0);

          angular.element(window).on('resize', chart.resize);
          $scope.$on('$destroy', function() {
            angular.element(window).off('resize', chart.resize);
          });
          // Must after `chart.resize` is removed
          $scope.$on('$destroy', function() {
            chart.dispose();
            chart = null;
          });

          chart.setTheme(defaults.lookAndFeel);
          chart.setOption(options, /*overwrite=*/true);

          // If no data is provided, the chart is not initialized. And you can see a caution on the canvas.
          var initialized = angular.isDefined(chart.getOption().xAxis);
          function initializeDoneCheck() {
            if (initialized) {
              // If data points are more than the maximal visible data points, we put them into a queue and then
              // add them to the chart after the option is applied, otherwise all data points will be shown on
              // the chart.
              if (options.dataPointsQueue && options.dataPointsQueue.length) {
                $scope.addDataPoints(options.dataPointsQueue);
                delete options.dataPointsQueue;
              }
              delete options.data;
            }
          }
          initializeDoneCheck();

          /** Method to add data points to chart */
          $scope.addDataPoints = function(data, newYAxisMaxValue) {
            if (!data || (Array.isArray(data) && !data.length)) {
              return;
            }
            try {
              // try to re-initialize when data is available
              if (!initialized) {
                $echarts.fillAxisData(options, Array.isArray(data) ? data : [data]);
                chart.setOption(options, /*overwrite=*/true);
                initialized = angular.isDefined(chart.getOption().xAxis);
                initializeDoneCheck();
                if (initialized) {
                  chart.hideLoading();
                }
                return;
              }

              var currentOption = chart.getOption();
              var actualVisibleDataPoints = currentOption.series[0].data.length;
              var dataPointsGrowNum = Math.max(0,
                (currentOption.visibleDataPointsNum || defaults.visibleDataPointsNum) - actualVisibleDataPoints);
              var xAxisTypeIsTime = currentOption.xAxis.type === 'time';
              var dataArray = makeDataArray(data, dataPointsGrowNum, xAxisTypeIsTime);
              if (dataArray.length > 0) {
                if (newYAxisMaxValue !== undefined) {
                  chart.setOption({
                    yAxis: [{max: newYAxisMaxValue}]
                  }, /*overwrite=*/false);
                }
                chart.addData(dataArray);
              }
            } catch (ex) {
            }
          };
        }]
    };
  })
/**
 * Constants of chart
 */
  .constant('dsEchartsDefaults', {
    // Echarts look and feel recommendation
    lookAndFeel: {
      markLine: {
        symbol: ['circle', 'circle']
      },
      title: {
        textStyle: {
          fontSize: 14,
          fontWeight: 400,
          color: '#000'
        }
      },
      legend: {
        textStyle: {
          color: '#111',
          fontWeight: 500
        },
        itemGap: 20
      },
      tooltip: {
        borderRadius: 2,
        padding: 8,
        showDelay: 0,
        transitionDuration: 0.5
      },
      textStyle: {
        fontFamily: 'lato,roboto,"helvetica neue","segoe ui",arial',
        fontSize: 12
      },
      loadingText: 'Data Loading...',
      noDataText: 'No Graphic Data Found',
      addDataAnimation: false
    },
    // The number of visible data points can be shown on chart
    visibleDataPointsNum: 80
  }
)
/**
 * Customize chart's look and feel.
 */
  .factory('$echarts', ['$filter', '$util', function($filter, $util) {
    'use strict';

    function buildTooltipSeriesTable(array) {

      function tooltipSeriesColorIndicatorHtml(color) {
        var border = zrender.tool.color.lift(color, -0.2);
        return '<div style="width: 10px; height: 10px; margin-top: 2px; border-radius: 2px; border: 1px solid ' + border + '; background-color: ' + color + '"></div>';
      }

      return '<table>' +
        array.map(function(obj) {
          if (!obj.name) {
            obj.name = obj.value;
            obj.value = '';
          }
          return '<tr>' +
            '<td>' + tooltipSeriesColorIndicatorHtml(obj.color) + '</td>' +
            '<td style="padding: 0 12px 0 4px">' + obj.name + '</td>' +
            '<td style="text-align: right">' + obj.value + '</td>' +
            '</tr>';
        }).join('') + '</table>';
    }

    function defaultNameFormatter(name) {
      var date = new Date(name);
      if (angular.isDate(date)) {
        return $filter('date')(name,
          (new Date()).getDate() === date.getDate() ?
            'HH:mm:ss' : 'yyyy-MM-dd HH:mm:ss');
      }
      return name;
    }

    function defaultValueFormatter(value) {
      return $filter('number')(value);
    }

    /**
     * Build the option object for tooltip
     */
    function tooltip(args) {
      var result = {
        trigger: args.trigger || 'axis',
        axisPointer: {type: 'none'},
        formatter: args.formatter,
        position: args.position || function(p) {
          return [p[0], 22]; // fix the tooltip position
        }
      };
      if (args.guidelineColor) {
        result.axisPointer = {
          type: 'line',
          lineStyle: {
            color: args.guidelineColor,
            width: 3,
            type: 'dotted'
          }
        };
      }
      return result;
    }

    /**
     * Tooltip content formatter for a multiple data series chart. Every
     * data series will have a colored legend in tooltip.
     */
    function tooltipAllSeriesFormatter(valueFormatter, nameFormatter) {
      return function(params) {
        var name = (nameFormatter || defaultNameFormatter)(params[0].name);
        var paramsSorted = $filter('orderBy')(params, 'value', /*reversed=*/true);
        return name +
          buildTooltipSeriesTable(paramsSorted.map(function(param) {
            return {
              color: param.series.colors.line,
              name: param.seriesName,
              value: (valueFormatter || defaultValueFormatter)(param.value)
            };
          }));
      };
    }

    /**
     * As we define the maximal visible data points, so we should split the data array
     * into two. The part `older` are old data points, that will be shown when the chart
     * is created. The part `newer` will be added afterwards by `addDataPoints()`.
     */
    function splitInitialData(data, visibleDataPoints) {
      if (!Array.isArray(data)) {
        data = [];
      }
      if (data.length <= visibleDataPoints) {
        return {older: data, newer: []};
      }
      return {
        older: data.slice(0, visibleDataPoints),
        newer: data.slice(visibleDataPoints)
      };
    }

    var self = {
      /**
       * Tooltip for category.
       */
      categoryTooltip: function(valueFormatter, guidelineColor) {
        return tooltip({
          formatter: tooltipAllSeriesFormatter(valueFormatter),
          guidelineColor: guidelineColor
        });
      },
      /**
       * Tooltip for timeline chart with some limitation.
       * trigger can only be 'item'. Use 'axis' would draw line in wrong direction!
       */
      timelineTooltip: function(valueFormatter) {
        return tooltip({
          trigger: 'item', // todo: https://github.com/ecomfe/echarts/issues/1954
          formatter: function(params) {
            var name = defaultNameFormatter(params.value[0]);
            return name +
              buildTooltipSeriesTable([{
                color: params.series.colors.line,
                name: params.series.name,
                value: valueFormatter ? valueFormatter(params.value[1]) : params.value[1]
              }]);
          }
        });
      },
      /**
       * Formatter to change axis label to human readable values.
       */
      axisLabelFormatter: function(unit) {
        return function(value) {
          if (value !== 0) {
            var hr = $util.toHumanReadable(value, 1000, 1);
            value = hr.value + ' ' + hr.modifier + (unit || '');
          }
          return value;
        };
      },
      /**
       * Build the option object for data series.
       */
      makeDataSeries: function(args) {
        args.type = args.type || 'line';
        var lineWidth = args.stack ? 4 : 3;
        var options = {
          symbol: 'circle',
          smooth: args.smooth,
          itemStyle: {
            normal: {
              color: args.colors.line,
              lineStyle: {
                color: args.colors.line,
                width: lineWidth
              }
            },
            emphasis: {
              color: args.colors.hover,
              lineStyle: {
                color: args.colors.line,
                width: lineWidth
              }
            }
          }
        };
        if (args.stack) {
          options.itemStyle.normal.areaStyle = {
            type: 'default',
            color: args.colors.area
          };
        } else if (args.showAllSymbol) {
          // bugfix: seems the line is 1px thicker than args.stack version!
          options.itemStyle.normal.lineStyle.width -= 1;
        }
        return angular.merge(args, options);
      },
      /**
       * Reset axises in option and fill with initial data.
       */
      fillAxisData: function(options, data, visibleDataPointsNum) {
        if (visibleDataPointsNum > 0) {
          options.visibleDataPointsNum = visibleDataPointsNum;
        } else if (!options.visibleDataPointsNum) {
          options.visibleDataPointsNum = Number.MAX_VALUE;
        }

        var dataSplit = splitInitialData(data, options.visibleDataPointsNum);
        if (dataSplit.newer.length) {
          options.dataPointsQueue = dataSplit.newer;
        }

        angular.forEach(options.series, function(series) {
          series.data = [];
        });

        if (options.xAxis[0].type === 'time') {
          // bugfix: https://github.com/ecomfe/echarts/issues/1954
          delete options.xAxis[0].boundaryGap;

          delete options.xAxis[0].data;
          angular.forEach(dataSplit.older, function(datum) {
            angular.forEach(options.series, function(series, seriesIndex) {
              series.data.push([datum.x, Array.isArray(datum.y) ? datum.y[seriesIndex] : datum.y]);
            });
          });
        } else {
          options.xAxis[0].data = [];
          angular.forEach(dataSplit.older, function(datum) {
            options.xAxis[0].data.push(datum.x);
            angular.forEach(options.series, function(series, seriesIndex) {
              series.data.push(Array.isArray(datum.y) ? datum.y[seriesIndex] : datum.y);
            });
          });
        }
      },
      /**
       * Return a copy of data with only the first series data.
       */
      firstSeriesData: function(data) {
        if (!Array.isArray(data)) {
          data = [data];
        }
        return data.map(function(datum) {
          return {
            x: datum.x,
            y: Array.isArray(datum.y) ? datum.y[0] : datum.y
          };
        });
      },
      /**
       * Return an array of color objects regarding the num of data series.
       */
      colorPalette: function(size) {
        return $util.colorPalette(size).map(function(base) {
          return self.buildColorStates(base);
        });
      },
      /**
       * Build colors for state set.
       */
      buildColorStates: function(base) {
        return {
          line: base,
          area: zrender.tool.color.lift(base, -0.92),
          hover: zrender.tool.color.lift(base, 0.1)
        };
      }
    };

    return self;
  }])
;