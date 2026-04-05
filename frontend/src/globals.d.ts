// CSS module declarations
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Allow CSS side-effect imports
declare module "*.css?raw" {
  const content: string;
  export default content;
}

// Wallet adapter styles
declare module "@solana/wallet-adapter-react-ui/styles.css";
