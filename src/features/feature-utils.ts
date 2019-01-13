import Database from '../database';
import AllFeatures from './all-features';
import Feature from './feature';

interface IFeaturesLookup {
  [key: string]: Feature;
}

const featuresLookup = AllFeatures as IFeaturesLookup;

export interface IBatchFeaturesEnabledLookup {
  [featureId: number]: boolean;
}

export namespace FeatureUtils {
  export async function getServerFeaturesStatus(
    db: Database,
    serverId: string
  ): Promise<IBatchFeaturesEnabledLookup> {
    const results = await db.query(
      'SELECT feature_id, is_enabled FROM server_features WHERE server_id = $1',
      [serverId]
    );
    const lookup: IBatchFeaturesEnabledLookup = {};

    for (const key in featuresLookup) {
      if (!featuresLookup.hasOwnProperty(key)) {
        continue;
      }

      const featureId = featuresLookup[key].id;
      lookup[featureId] = true;
    }

    for (const row of results.rows) {
      const featureId = parseInt(row.feature_id, 10);
      const isEnabled = parseInt(row.is_enabled, 10);

      lookup[featureId] = isEnabled !== 0;
    }

    return lookup;
  }
}

export default FeatureUtils;
