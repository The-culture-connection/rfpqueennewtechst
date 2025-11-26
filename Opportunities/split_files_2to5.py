import os

# File paths
output_dir = r'C:\Users\grace\my-firebase-project\webapp\Opportunities'

# Files to split (2-5)
files_to_split = [2, 3, 4, 5]

for file_num in files_to_split:
    input_file = os.path.join(output_dir, f'govcontracts{file_num}.csv')
    
    if not os.path.exists(input_file):
        print(f'Warning: {input_file} not found, skipping...')
        continue
    
    print(f'\nReading {input_file}...')
    
    # Try different encodings
    encodings = ['utf-8', 'cp1252', 'latin-1', 'iso-8859-1']
    lines = None
    file_encoding = 'utf-8'
    
    for encoding in encodings:
        try:
            with open(input_file, 'r', encoding=encoding, errors='replace') as f:
                lines = f.readlines()
            file_encoding = encoding
            print(f'Successfully read file with {encoding} encoding')
            break
        except UnicodeDecodeError:
            continue
    
    if lines is None:
        print(f'Error: Could not read {input_file}, skipping...')
        continue
    
    header = lines[0]
    data_lines = lines[1:]
    total_data_rows = len(data_lines)
    
    print(f'Total: {len(lines)} lines (header + {total_data_rows} data rows)')
    
    # Calculate split point (half)
    midpoint = len(data_lines) // 2
    
    # First half
    output_file_a = os.path.join(output_dir, f'govcontracts{file_num}a.csv')
    with open(output_file_a, 'w', encoding=file_encoding, errors='replace') as f:
        f.write(header)
        f.writelines(data_lines[:midpoint])
    
    print(f'Created {output_file_a} with {midpoint} data rows')
    
    # Second half
    output_file_b = os.path.join(output_dir, f'govcontracts{file_num}b.csv')
    with open(output_file_b, 'w', encoding=file_encoding, errors='replace') as f:
        f.write(header)
        f.writelines(data_lines[midpoint:])
    
    remaining_rows = total_data_rows - midpoint
    print(f'Created {output_file_b} with {remaining_rows} data rows')
    
    # Delete the original file
    os.remove(input_file)
    print(f'Deleted original file: {input_file}')

print(f'\nSuccessfully split files 2-5 in half!')

