const AWS = require('aws-sdk');
const sharp = require('sharp');

exports.handler = async (event, context) => {
  const s3 = new AWS.S3();
  const srcBucket = event.Records && event.Records[0].s3.bucket.name;
  const srcKey = event.Records && decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  const dstBucket = `${srcBucket}-resized`;

  // Check if srcBucket and srcKey are defined
  if (!srcBucket || !srcKey) {
    console.error('Invalid event:', event);
    return;
  }

  // Retrieve the image from S3
  const params = {
    Bucket: srcBucket,
    Key: srcKey,
  };
  const image = await s3.getObject(params).promise();

  // Create four different resolutions of the image using Sharp
  const thumbnail = await sharp(image.Body).resize({ width: 160, height: 160, fit: "inside" }).toBuffer();
  const small = await sharp(image.Body).resize({ width: 320, height: 320, fit: "inside" }).toBuffer();
  const medium = await sharp(image.Body).resize({ width: 640, height: 640, fit: "inside" }).toBuffer();
  const large = await sharp(image.Body).resize({ width: 1280, height: 1280, fit: "inside" }).toBuffer();

  // Upload the new images to S3 with different prefixes
  await Promise.all([
    s3.putObject({ Bucket: dstBucket, Key: `thumbnails/${srcKey}`, Body: thumbnail }).promise(),
    s3.putObject({ Bucket: dstBucket, Key: `small/${srcKey}`, Body: small }).promise(),
    s3.putObject({ Bucket: dstBucket, Key: `medium/${srcKey}`, Body: medium }).promise(),
    s3.putObject({ Bucket: dstBucket, Key: `large/${srcKey}`, Body: large }).promise(),
  ]);

  return `Successfully resized ${srcBucket}/${srcKey} and uploaded to ${dstBucket}`;
};

