from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from key_management import load_private_key, load_public_key
import base64

def encrypt_data(data):
    """Encrypt data using the public key."""
    public_key = load_public_key()
    encrypted = public_key.encrypt(
        data.encode(),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return base64.b64encode(encrypted).decode()

def decrypt_data(encrypted_data):
    """Decrypt data using the private key."""
    private_key = load_private_key()
    decrypted = private_key.decrypt(
        base64.b64decode(encrypted_data),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return decrypted.decode()

if __name__ == "__main__":
    # Example usage
    original_data = "This is a secret message."
    print(f"Original Data: {original_data}")

    encrypted_data = encrypt_data(original_data)
    print(f"Encrypted Data: {encrypted_data}")

    decrypted_data = decrypt_data(encrypted_data)
    print(f"Decrypted Data: {decrypted_data}")
