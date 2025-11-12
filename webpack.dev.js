const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/DevStandalone.tsx", // Development entry point with mock services

  devtool: 'eval-source-map', // Better debugging with source maps

  output: {
    path: path.resolve(__dirname, 'dev-dist'),
    publicPath: "/",
    clean: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    extensions: [".tsx", ".ts", ".js"],
  },

  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true, // Faster compilation in dev mode
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './public/dev-index.html',
      title: 'CollectionViewer - Development Mode'
    }),
  ],

  devServer: {
    port: 3034, // Development server port
    static: {
      directory: path.join(__dirname, "public"),
    },
    hot: true, // Hot Module Replacement enabled
    open: true, // Auto-open browser
    historyApiFallback: true,
    client: {
      overlay: {
        warnings: false,
        errors: true
      },
      progress: true
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  },

  // Optimize for development speed
  optimization: {
    splitChunks: false, // Disable code splitting in dev mode
    runtimeChunk: false,
    moduleIds: 'named' // Better debugging
  },

  // Performance hints disabled in dev
  performance: {
    hints: false
  }
};
