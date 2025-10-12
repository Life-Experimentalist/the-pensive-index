import path from 'path';
import webpack from 'webpack';

let SpeedMeasurePlugin;
let smp;
try {
  SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
  smp = new SpeedMeasurePlugin();
} catch (err) {
  console.warn('SpeedMeasurePlugin not installed, skipping speed measurement.');
  smp = { wrap: config => config };
}

const webpackConfig = smp.wrap({
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
    }),
  ],
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
});
export default webpackConfig;
