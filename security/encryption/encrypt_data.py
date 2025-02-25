from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from key_management import load_private_key, load_public_key
import os
import base64

def encrypt_data_rsa(data):
    """Encrypt data using RSA public key."""
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

def decrypt_data_rsa(encrypted_data):
    """Decrypt data using RSA private key."""
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

def encrypt_data_aes(data, key):
    """Encrypt data using AES symmetric key."""
    iv = os.urandom(16)  # Generate a random IV
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()

    # Pad data to be multiple of block size
    pad_length = 16 - (len(data) % 16)
    padded_data = data + (chr(pad_length) * pad_length).encode()

    encrypted = encryptor.update(padded_data) + encryptor.finalize()
    return base64.b64encode(iv + encrypted).decode()  # Prepend IV for decryption

def decrypt_data_aes(encrypted_data, key):
    """Decrypt data using AES symmetric key."""
    encrypted_data = base64.b64decode(encrypted_data)
    iv = encrypted_data[:16]  # Extract the IV
    encrypted_data = encrypted_data[16:]  # Extract the actual encrypted data

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    decrypted_padded = decryptor.update(encrypted_data) + decryptor.finalize()

    # Remove padding
    pad_length = decrypted_padded[-1]
    return decrypted_padded[:-pad_length]. ```python
    
def main():
    # Example usage
    original_data = "This is a secret message."
    print(f"Original Data: {original_data}")

    # RSA Encryption/Decryption
    encrypted_data_rsa = encrypt_data_rsa(original_data)
    print(f"Encrypted Data (RSA): {encrypted_data_rsa}")

    decrypted_data_rsa = decrypt_data_rsa(encrypted_data_rsa)
    print(f"Decrypted Data (RSA): {decrypted_data_rsa}")

    # AES Encryption/Decryption
    aes_key = os.urandom(32)  # Generate a random 256-bit key for AES
    encrypted_data_aes = encrypt_data_aes(original_data, aes_key)
    print(f"Encrypted Data (AES): {encrypted_data_aes}")

    decrypted_data_aes = decrypt_data_aes(encrypted_data_aes, aes_key)
    print(f"Decrypted Data (AES): {decrypted_data_aes}")

if __name__ == "__main__":
    main()
