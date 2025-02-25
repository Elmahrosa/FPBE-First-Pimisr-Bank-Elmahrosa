from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import os

KEYS_DIR = 'encryption_keys/'

def generate_keys():
    """Generate a new RSA public/private key pair and save them to files."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    public_key = private_key.public_key()

    # Save the private key
    with open(os.path.join(KEYS_DIR, 'private_key.pem'), 'wb') as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
        ))

    # Save the public key
    with open(os.path.join(KEYS_DIR, 'public_key.pem'), 'wb') as f:
        f.write(public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ))

    print("Keys generated and saved successfully.")

def load_private_key():
    """Load the private key from the PEM file."""
    with open(os.path.join(KEYS_DIR, 'private_key.pem'), 'rb') as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=None,
            backend=default_backend()
        )
    return private_key

def load_public_key():
    """Load the public key from the PEM file."""
    with open(os.path.join(KEYS_DIR, 'public_key.pem'), 'rb') as f:
        public_key = serialization.load_pem_public_key(
            f.read(),
            backend=default_backend()
        )
    return public_key

if __name__ == "__main__":
    generate_keys()
