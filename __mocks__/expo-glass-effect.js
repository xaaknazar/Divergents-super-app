// Jest: нативного Liquid Glass нет — GlassView ведёт себя как обычный View, а проверка
// доступности возвращает false, поэтому компоненты рисуют запасное стекло.
const React = require('react');
const { View } = require('react-native');
const GlassView = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }));
module.exports = {
  GlassView,
  GlassContainer: GlassView,
  isLiquidGlassAvailable: () => false,
  isGlassEffectAPIAvailable: () => false,
};
