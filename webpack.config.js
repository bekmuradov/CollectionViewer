const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const deps = require("./package.json").dependencies;

module.exports = {
  mode: "development",
  entry: "./src/index",
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: "auto",
    clean: true,
    library: {
      type: 'var',
      name: 'CollectionViewer'
    }
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: "ts-loader",
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
    new ModuleFederationPlugin({
      name: "CollectionViewer",
      library: { type: "var", name: "CollectionViewer" },
      filename: "remoteEntry.js",
      exposes: {
        "./CollectionViewer": "./src/index",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: deps.react,
          eager: false,        // FIXED: Wait for host's React instance
          strictVersion: false // Allow version flexibility
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
          eager: false,        // FIXED: Wait for host's React instance
          strictVersion: false
        },
        "react/jsx-runtime": { // ADDED: Share JSX runtime
          singleton: true,
          eager: false,
          strictVersion: false
        }
      }
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
  devServer: {
    port: 3002,
    static: {
      directory: path.join(__dirname, "public"),
    },
    hot: true,
  },
};
