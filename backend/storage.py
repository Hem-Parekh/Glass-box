"""Where uploaded files live. The database keeps each file's record (name, type, company, who uploaded it); the bytes go
to a storage backend chosen with GB_STORAGE:

  local  a folder on the server's disk (GB_UPLOADS). Fine for one server; back the folder up.
  s3     any S3-compatible store in an Indian region (AWS S3 ap-south-1, or similar). Needs boto3 and
         GB_S3_BUCKET, plus the usual AWS_* credentials or an instance role. Objects are written with server-side encryption.
"""
import os

from backend.config import settings


class LocalStorage:
    def __init__(self, root):
        self.root = root

    def _path(self, key):
        if not key or "/" in key or "\\" in key or key.startswith("."):
            raise ValueError("bad file key")
        return os.path.join(self.root, key)

    def put(self, key, data: bytes, mime):
        os.makedirs(self.root, exist_ok=True)
        with open(self._path(key), "wb") as f:
            f.write(data)

    def get(self, key) -> bytes:
        with open(self._path(key), "rb") as f:
            return f.read()

    def delete(self, key):
        try:
            os.remove(self._path(key))
        except FileNotFoundError:
            pass


class S3Storage:
    def __init__(self, bucket, prefix="uploads/"):
        import boto3  # only needed when GB_STORAGE=s3
        self.s3, self.bucket, self.prefix = boto3.client("s3"), bucket, prefix

    def put(self, key, data, mime):
        self.s3.put_object(Bucket=self.bucket, Key=self.prefix + key, Body=data, ContentType=mime, ServerSideEncryption="AES256")

    def get(self, key):
        return self.s3.get_object(Bucket=self.bucket, Key=self.prefix + key)["Body"].read()

    def delete(self, key):
        self.s3.delete_object(Bucket=self.bucket, Key=self.prefix + key)


def storage():
    if settings.storage == "s3":
        return S3Storage(os.environ["GB_S3_BUCKET"])
    return LocalStorage(settings.uploads)
