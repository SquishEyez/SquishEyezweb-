import {
    Asset,
    AssetType,
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    Struct,
} from '@wharfkit/antelope'

export interface TokenBalanceType {
    asset: AssetType
    contract: NameType
    metadata: TokenMetaType
}

export interface TokenIdentifierType {
    chain: Checksum256Type
    contract: NameType
    symbol: Asset.SymbolType
}

export interface TokenMetaType {
    id: TokenIdentifierType
    logo?: string
}

@Struct.type('token_identifier')
export class TokenIdentifier extends Struct {
    @Struct.field(Checksum256) declare chain: Checksum256
    @Struct.field(Name) declare contract: Name
    @Struct.field(Asset.Symbol) declare symbol: Asset.Symbol
}

@Struct.type('token_meta')
export class TokenMeta extends Struct {
    @Struct.field(TokenIdentifier) declare id: TokenIdentifier
    @Struct.field('string', {optional: true}) declare logo?: string
}

@Struct.type('token_balance')
export class TokenBalance extends Struct {
    @Struct.field(Asset) declare asset: Asset
    @Struct.field(Name) declare contract: Name
    @Struct.field(TokenMeta) declare metadata: TokenMeta
}
