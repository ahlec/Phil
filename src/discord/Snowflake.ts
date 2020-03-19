declare const SnowflakeBrandedTag: unique symbol;

export type Snowflake = string & { readonly [SnowflakeBrandedTag]: true };

export function isSnowflake(str: string): str is Snowflake {}
