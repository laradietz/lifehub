import logging
from collections.abc import Iterator
from typing import BinaryIO, Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger("lifehub.storage")


class StorageService:
    """Almacenamiento de archivos privados en un bucket S3-compatible (MinIO en desarrollo).

    Los archivos nunca se sirven con URLs firmadas directas al navegador: el backend
    siempre hace de proxy al leerlos (ver DocumentService.get_file_stream), asi que
    S3_ENDPOINT_URL solo necesita ser alcanzable desde la red de Docker, no desde el navegador.
    """

    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )
        self._bucket = settings.S3_BUCKET_NAME

    def ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            try:
                self._client.create_bucket(Bucket=self._bucket)
            except ClientError as exc:
                logger.warning("No se pudo crear/verificar el bucket %s: %s", self._bucket, exc)

    def upload(self, key: str, file_obj: BinaryIO, content_type: Optional[str]) -> None:
        extra_args = {"ContentType": content_type} if content_type else {}
        self._client.upload_fileobj(file_obj, self._bucket, key, ExtraArgs=extra_args)

    def stream(self, key: str) -> tuple[Iterator[bytes], Optional[str]]:
        obj = self._client.get_object(Bucket=self._bucket, Key=key)
        body = obj["Body"]

        def iterator() -> Iterator[bytes]:
            for chunk in body.iter_chunks(chunk_size=8192):
                yield chunk

        return iterator(), obj.get("ContentType")

    def delete(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except ClientError as exc:
            logger.warning("No se pudo borrar el archivo %s del storage: %s", key, exc)


_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
