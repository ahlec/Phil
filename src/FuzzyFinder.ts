import * as Fuse from 'fuse.js';

interface FuzzyValue<TValue> {
  name: string;
  value: TValue;
}

export default class FuzzyFinder<TValue, TSelectorData> {
  private readonly fuse: Fuse<
    FuzzyValue<TValue>,
    {
      includeScore: true;
    }
  >;

  public constructor(
    values: { [id: string]: TValue },
    nameSelector: (value: TValue, additionalData?: TSelectorData) => string,
    selectorData?: TSelectorData
  ) {
    const searchValues: ReadonlyArray<FuzzyValue<TValue>> = Object.keys(
      values
    ).map((id) => ({
      name: nameSelector(values[id], selectorData),
      value: values[id],
    }));

    this.fuse = new Fuse(searchValues, {
      distance: 100,
      includeScore: true,
      keys: ['name'],
      location: 0,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      shouldSort: true,
      threshold: 0.45,
    });
  }

  public search(searchString: string): TValue | undefined {
    const result = this.fuse.search(searchString);
    if (!result.length) {
      return;
    }

    return result[0].item.value;
  }
}
