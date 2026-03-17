import { AssetType } from '../core/state';

export interface AssetDefinition {
  type: AssetType;
  name: string;
  description: string;
  oracleTypeHint: string;
  fungible: boolean;
  expirationRelevant: boolean;
  priceVolatility: 'none' | 'low' | 'medium' | 'high';
  transferRestrictions: string;
}

export const ASSET_CATALOG: Map<AssetType, AssetDefinition> = new Map([
  [
    'fiat_voucher',
    {
      type: 'fiat_voucher',
      name: 'Fiat Voucher',
      description:
        'A voucher denominated in fiat currency, redeemable at registered merchants for goods or services.',
      oracleTypeHint: 'government_id_oracle',
      fungible: true,
      expirationRelevant: true,
      priceVolatility: 'none',
      transferRestrictions: 'Non-transferable between beneficiaries',
    },
  ],
  [
    'cloud_compute',
    {
      type: 'cloud_compute',
      name: 'Cloud Compute Credits',
      description:
        'Credits for cloud computing resources (CPU hours, GPU time, storage). Typically corporate or research programs.',
      oracleTypeHint: 'api_usage_oracle',
      fungible: true,
      expirationRelevant: true,
      priceVolatility: 'low',
      transferRestrictions: 'Transferable within organization',
    },
  ],
  [
    'equity_tokens',
    {
      type: 'equity_tokens',
      name: 'Equity Tokens',
      description:
        'Tokenized equity or profit-sharing instruments. Subject to securities regulations.',
      oracleTypeHint: 'market_price_oracle',
      fungible: true,
      expirationRelevant: false,
      priceVolatility: 'high',
      transferRestrictions: 'Regulated transfer with KYC',
    },
  ],
  [
    'carbon_credits',
    {
      type: 'carbon_credits',
      name: 'Carbon Credits',
      description:
        'Verified carbon offset credits. Requires environmental oracle for verification of offset claims.',
      oracleTypeHint: 'environmental_oracle',
      fungible: true,
      expirationRelevant: true,
      priceVolatility: 'medium',
      transferRestrictions: 'Transferable with registry update',
    },
  ],
  [
    'data_access',
    {
      type: 'data_access',
      name: 'Data Access Tokens',
      description:
        'Tokens granting access to datasets, APIs, or information services. Usage-based consumption.',
      oracleTypeHint: 'api_usage_oracle',
      fungible: false,
      expirationRelevant: true,
      priceVolatility: 'low',
      transferRestrictions: 'Non-transferable, bound to user',
    },
  ],
  [
    'physical_goods',
    {
      type: 'physical_goods',
      name: 'Physical Goods Voucher',
      description:
        'Voucher redeemable for physical goods (food, medicine, materials). Requires supply chain oracle.',
      oracleTypeHint: 'supply_chain_oracle',
      fungible: false,
      expirationRelevant: true,
      priceVolatility: 'medium',
      transferRestrictions: 'Non-transferable, identity-linked',
    },
  ],
  [
    'custom',
    {
      type: 'custom',
      name: 'Custom Asset',
      description:
        'User-defined asset type with custom properties. Oracle and restrictions configured per deployment.',
      oracleTypeHint: 'custom_oracle',
      fungible: true,
      expirationRelevant: true,
      priceVolatility: 'medium',
      transferRestrictions: 'User-defined',
    },
  ],
]);

/**
 * Get the asset definition for a given type.
 */
export function getAssetDefinition(type: AssetType): AssetDefinition | undefined {
  return ASSET_CATALOG.get(type);
}
