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
    export function getByName(name: string): Feature {
        for (const key in featuresLookup) {
            if (!featuresLookup.hasOwnProperty(key)) {
                continue;
            }

            const feature = featuresLookup[key];
            if (feature.is(name)) {
                return feature;
            }
        }

        return null;
    }

    export function getUnknownFeatureNameErrorMessage(providedName: string): string {
        let message = 'There is no feature with the name `' + providedName + '`. The features that I know about are as follows:\n\n';

        for (const key in featuresLookup) {
            if (!featuresLookup.hasOwnProperty(key)) {
                continue;
            }

            const feature = featuresLookup[key];
            message += feature.getInformationalDisplayLine();
            message += '\n';
        }

        return message.trimRight();
    }

    export async function getServerFeaturesStatus(db: Database, serverId: string): Promise<IBatchFeaturesEnabledLookup> {
        const results = await db.query('SELECT feature_id, is_enabled FROM server_features WHERE server_id = $1', [serverId]);
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

            lookup[featureId] = (isEnabled !== 0);
        }

        return lookup;
    }
}

export default FeatureUtils;
