/* eslint-disable no-await-in-loop, no-restricted-syntax */

require('dotenv').config({
  path: '../.env',
});
const { Pool } = require('pg');

const PG_POOL = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function query(queryStr, values) {
  return new Promise((resolve, reject) => {
    PG_POOL.connect((error, client, done) => {
      if (error) {
        reject(error);
      }

      client.query(queryStr, values, (err, result) => {
        done();

        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      });
    });
  });
}

async function addUnpublishedPrompt(submissionId, bucketId) {
  console.log('submissionId:', submissionId, 'bucketId:', bucketId);
  let lastPromptNumber;
  try {
    const results = await query(
      `SELECT
      p2.prompt_number
    FROM
      prompt_v2 AS p2
    JOIN
      submission AS s
    ON
      p2.submission_id = s.submission_id
    WHERE
      s.bucket_id = $1
    ORDER BY
      p2.prompt_number DESC
    LIMIT 1`,
      [bucketId]
    );

    const [row] = results.rows;
    lastPromptNumber = row ? row.prompt_number : 0;
  } catch (e1) {
    console.log('e1');
    throw e1;
  }

  try {
    await query(
      `INSERT INTO
        prompt_v2(
          submission_id,
          prompt_number,
          has_been_posted
        )
     VALUES($1, $2, $3)`,
      [submissionId, lastPromptNumber + 1, 0]
    );
  } catch (e2) {
    console.log('e2');
    throw e2;
  }

  return { submissionId, promptNumber: lastPromptNumber + 1 };
}

function deleteMigration(submissionId, promptNumber) {
  return query(
    `DELETE FROM
      prompt_v2
    WHERE
      submission_id = $1 AND
      prompt_number = $2`,
    [submissionId, promptNumber]
  );
}

async function deleteMigrations(migrations) {
  const promises = migrations.map(({ submissionId, promptNumber }) =>
    deleteMigration(submissionId, promptNumber)
  );
  await Promise.all(promises);
}

async function main() {
  const unpublishedPrompts = await query(`
    SELECT
      s.submission_id,
      s.bucket_id
    FROM
      prompts AS p
    JOIN
      submission AS s
    ON
      p.prompt_text = s.submission_text AND
      p.suggesting_userid = s.suggesting_userid
    WHERE
      p.has_been_posted = E'0' AND
      p.approved_by_admin = E'1'
  `);

  const { rows } = unpublishedPrompts;
  const successfulMigrations = [];
  try {
    for (const { submission_id: submissionId, bucket_id: bucketId } of rows) {
      const migration = await addUnpublishedPrompt(submissionId, bucketId);
      successfulMigrations.push(migration);
    }

    console.log(successfulMigrations.length, 'rows migrated');
  } catch (e) {
    await deleteMigrations(successfulMigrations);
    console.log('error', e);
  }
}

main();
