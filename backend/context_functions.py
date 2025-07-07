# context_function.py
import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime, timedelta
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime, timedelta

def parse_document_data(div_element):
    """Parses document data from a single <div> element."""
    title_element = div_element.find('a', class_='goto_page')
    title = title_element.get_text(strip=True) if title_element else ""
    link = title_element.get('href', '') if title_element else ""
    
    dt_elements = div_element.find_all('dt', class_='search_result_line')
    headline = dt_elements[0].get_text(strip=True) if dt_elements else ""
    
    source_element = div_element.find('i')
    source = source_element.get_text(strip=True) if source_element else ""
    
    return {"title": title, "link": link, "headline": headline, "source": source}

def parse_results_from_html(html_content):
    """Parse results directly from HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    results = []
    
    # Target class fragments to check if they are present in the div's class attribute
    target_classes = ["col-md-8", "col-sm-8", "col-xs-12"]
    
    # Extract all divs
    all_divs = soup.find_all('div')
    
    for div in all_divs:
        div_classes = div.get("class", [])  # Get class list (default to empty list if no class)
        
        # Check if any target class fragments are present in the div's class list
        if any(target in div_classes for target in target_classes):
            parsed_data = parse_document_data(div)
            if parsed_data["title"]:  # Ensure only non-empty results are stored
                results.append(parsed_data)
    
    return results

def fetch_legal_cases(query, limit=5):
    """
    Fetch relevant legal cases from HeinOnline based on the query.
    
    Args:
        query: The search query
        limit: Maximum number of cases to return
        
    Returns:
        A string with the case information
    """
    try:
        # Set up browser options
        options = uc.ChromeOptions()
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-popup-blocking")
        options.add_argument("--disable-infobars")
        options.add_argument("--headless")  # Run in headless mode for production

        # Initialize browser
        driver = uc.Chrome(options=options)
        print("Browser initialized")

        # Navigate to login page
        current_url = "https://svkm.mapmyaccess.com/"
        driver.get(current_url)
        print("Login page loaded")
        time.sleep(5)

        # Ensure we're in the main frame
        driver.switch_to.default_content()

        # Click the login button
        try:
            buttons = driver.find_elements(By.CSS_SELECTOR, "a[data-target='#loginModal']")
            if buttons:
                driver.execute_script("arguments[0].click();", buttons[0])
                print("Login button clicked")
                time.sleep(2)
            else:
                print("Login button not found")
        except Exception as e:
            print(f"Error clicking login button: {e}")

        # Wait for login modal to appear
        try:
            WebDriverWait(driver, 5).until(EC.visibility_of_element_located((By.ID, "loginModal")))
            print("Login modal appeared")
        except:
            print("Login modal did not appear")

        # Fill in email
        try:
            email_field = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.ID, "UserName-popup")))
            email_field.clear()
            email_field.send_keys("60003220050@svkmgrp.com")
            print("Email filled")
        except:
            print("Email field not found")

        # Fill in password
        try:
            password_field = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.ID, "Password-popup")))
            password_field.clear()
            password_field.send_keys("April*2314")
            print("Password filled")
        except:
            print("Password field not found")

        # Handle CAPTCHA
        try:
            captcha_text_script = "return document.querySelector('p[id=\"mainCaptcha\"]').innerText"
            captcha_text = driver.execute_script(captcha_text_script)

            if captcha_text:
                cleaned_captcha = "".join(captcha_text.split())
                print(f"Captcha extracted: {cleaned_captcha}")

                captcha_input = driver.find_element(By.ID, "txtInput")
                captcha_input.clear()
                captcha_input.send_keys(cleaned_captcha)
                print("Captcha filled")
            else:
                print("Captcha not found")
        except Exception as e:
            print(f"Error handling captcha: {e}")

        # Click login button
        try:
            final_login_button = driver.find_element(By.CSS_SELECTOR, "button.social-button.login-option-btn.loginAuthBtnHover")
            driver.execute_script("arguments[0].click();", final_login_button)
            print("Final login button clicked")
        except:
            print("Final login button not found")

        # Wait for page to load after login
        try:
            WebDriverWait(driver, 10).until(EC.url_changes(current_url))
            print("New page loaded after login")
        except:
            print("Page did not load within timeout")

        # Wait for navigation elements to appear
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a.sub-item")))

        # Navigate to Law Databases
        try:
            law_db_link = driver.find_element(By.XPATH, "//a[contains(text(), 'Law Databases')]")
            driver.execute_script("arguments[0].click();", law_db_link)
            print("Navigated to Law Databases")
        except:
            print("Law db link not found")

        # Define HeinOnline URL
        hein_url = "https://heinonline-org.svkm.mapmyaccess.com/HOL/Welcome"

        # Wait for links to load
        WebDriverWait(driver, 15).until(EC.presence_of_all_elements_located((By.TAG_NAME, "a")))

        # Find and click HeinOnline link
        all_links = driver.find_elements(By.TAG_NAME, "a")
        for link in all_links:
            if link.get_attribute("href") == hein_url:
                driver.execute_script("arguments[0].click();", link)
                print("HeinOnline link clicked")
                break

        # Wait for new tab to open and switch to it
        WebDriverWait(driver, 10).until(lambda d: len(d.window_handles) > 1)
        new_tab = driver.window_handles[-1]
        driver.switch_to.window(new_tab)
        print("Switched to HeinOnline tab")

        # Wait for search input
        WebDriverWait(driver, 10).until(EC.presence_of_all_elements_located((By.TAG_NAME, "input")))

        # Enter search query
        try:
            hein_input_search_query_element = driver.find_element(By.ID, "full_text_terms")
            driver.execute_script("arguments[0].value = arguments[1]", hein_input_search_query_element, query)
            print(f"Entered search query: {query}")
        except:
            print("Hein input search query element not found")

        # Wait for search button
        WebDriverWait(driver, 10).until(EC.presence_of_all_elements_located((By.TAG_NAME, "button")))

        # Click search button
        try:
            hein_input_search_button = driver.find_element(By.ID, "sendit_full_text")
            driver.execute_script("arguments[0].click()", hein_input_search_button)
            print("Search button clicked")
        except:
            print("Hein search button not found")    

        # Wait for page to fully load
        WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
        print("Search results page loaded")

        # Get page HTML
        page_html = driver.page_source

        # Parse the results directly
        results = parse_results_from_html(page_html)
        print(f"Found {len(results)} document records")

        # Limit results as requested
        results = results[:limit]

        # Format the results
        if not results:
            return "No relevant legal cases found for this query."
        
        formatted_results = "Relevant Legal Cases:\n\n"
        for case in results:
            formatted_results += f"Case: {str(case.get('title', 'N/A'))}\n"
            if case['headline']:
                formatted_results += f"Headline: {str(case.get('headline', 'N/A'))}\n"
            if case['source']:
                formatted_results += f"Source: {str(case.get('source', 'N/A'))}\n"
            if case['link']:
                formatted_results += f"Link: {str(case.get('link', 'N/A'))}\n"
            formatted_results += "\n"
        
        # Close the browser
        driver.quit()
        print("Browser closed")
        
        return formatted_results
        
    except Exception as e:
        # Make sure to close the browser if an error occurs
        try:
            driver.quit()
        except:
            pass
        return f"Error fetching legal cases: {str(e)}"

def fetch_news_articles(query, days=7, limit=5):
    """
    Fetch relevant news articles from LiveLaw based on the query.
    
    Args:
        query: The search query
        days: Number of days to look back (currently not used in the implementation)
        limit: Maximum number of articles to return
        
    Returns:
        A string with the news information from LiveLaw
    """
    try:
        # Set up browser options
        options = uc.ChromeOptions()
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-popup-blocking")
        options.add_argument("--disable-infobars")
        options.add_argument("--headless")  # Run in headless mode for production

        # Initialize browser
        driver = uc.Chrome(options=options)
        print("Browser initialized")

        # Navigate to login page
        current_url = "https://svkm.mapmyaccess.com/"
        driver.get(current_url)
        print("Login page loaded")
        time.sleep(5)

        # Ensure we're in the main frame
        driver.switch_to.default_content()

        # Click the login button
        try:
            buttons = driver.find_elements(By.CSS_SELECTOR, "a[data-target='#loginModal']")
            if buttons:
                driver.execute_script("arguments[0].click();", buttons[0])
                print("Login button clicked")
                time.sleep(2)
            else:
                print("Login button not found")
        except Exception as e:
            print(f"Error clicking login button: {e}")

        # Wait for login modal to appear
        try:
            WebDriverWait(driver, 5).until(EC.visibility_of_element_located((By.ID, "loginModal")))
            print("Login modal appeared")
        except:
            print("Login modal did not appear")

        # Fill in email
        try:
            email_field = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.ID, "UserName-popup")))
            email_field.clear()
            email_field.send_keys("60003220050@svkmgrp.com")
            print("Email filled")
        except:
            print("Email field not found")

        # Fill in password
        try:
            password_field = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.ID, "Password-popup")))
            password_field.clear()
            password_field.send_keys("April*2314")
            print("Password filled")
        except:
            print("Password field not found")

        # Handle CAPTCHA
        try:
            captcha_text_script = "return document.querySelector('p[id=\"mainCaptcha\"]').innerText"
            captcha_text = driver.execute_script(captcha_text_script)

            if captcha_text:
                cleaned_captcha = "".join(captcha_text.split())
                print(f"Captcha extracted: {cleaned_captcha}")

                captcha_input = driver.find_element(By.ID, "txtInput")
                captcha_input.clear()
                captcha_input.send_keys(cleaned_captcha)
                print("Captcha filled")
            else:
                print("Captcha not found")
        except Exception as e:
            print(f"Error handling captcha: {e}")

        # Click login button
        try:
            final_login_button = driver.find_element(By.CSS_SELECTOR, "button.social-button.login-option-btn.loginAuthBtnHover")
            driver.execute_script("arguments[0].click();", final_login_button)
            print("Final login button clicked")
        except:
            print("Final login button not found")

        # Wait for page to load after login
        try:
            WebDriverWait(driver, 10).until(EC.url_changes(current_url))
            print("New page loaded after login")
        except:
            print("Page did not load within timeout")

        # Wait for navigation elements to appear
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a.sub-item")))

        # Navigate to Law Databases
        try:
            law_db_link = driver.find_element(By.XPATH, "//a[contains(text(), 'Law Databases')]")
            driver.execute_script("arguments[0].click();", law_db_link)
            print("Navigated to Law Databases")
        except:
            print("Law db link not found")

        # Define LiveLaw URL
        livelaw_url = "https://www-livelaw-in.svkm.mapmyaccess.com/"

        # Wait for links to load
        WebDriverWait(driver, 15).until(EC.presence_of_all_elements_located((By.TAG_NAME, "a")))

        # Find and click LiveLaw link
        all_links = driver.find_elements(By.TAG_NAME, "a")
        for link in all_links:
            if link.get_attribute("href") == livelaw_url:
                driver.execute_script("arguments[0].click();", link)
                print("LiveLaw link clicked")
                break

        # Wait for new tab to open and switch to it
        WebDriverWait(driver, 10).until(lambda d: len(d.window_handles) > 1)
        new_tab = driver.window_handles[-1]
        driver.switch_to.window(new_tab)
        print("Switched to LiveLaw tab")

        # Store the old URL to detect when the page changes
        old_url = driver.current_url
        
        # Wait for the page to fully load
        WebDriverWait(driver, 10).until(EC.url_changes(old_url))

        # Wait for search input to be available
        WebDriverWait(driver, 10).until(EC.presence_of_all_elements_located((By.TAG_NAME, "input")))

        # Enter search query
        try:
            livelaw_search_input_script = "return document.querySelector('input[class=\"search-input\"]')"
            livelaw_input_search_query_element = driver.execute_script(livelaw_search_input_script)
            driver.execute_script("arguments[0].value = arguments[1]", livelaw_input_search_query_element, query)
            print(f"Entered search query: {query}")
        except:
            print("Live law input search query element not found")

        # Wait for search button
        WebDriverWait(driver, 10).until(EC.presence_of_all_elements_located((By.TAG_NAME, "button")))

        # Click search button
        try:
            livelaw_input_search_button = driver.execute_script("return document.querySelector('button[class=\"header-search-btn\"]')")
            driver.execute_script("arguments[0].click()", livelaw_input_search_button)
            print("Search button clicked")
        except:
            print("Live law search button not found")    

        # Wait for page to fully load
        WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
        print("Search results page loaded")

        # Get page HTML
        page_html = driver.page_source
        print("Page HTML extracted")

        # Parse the results
        soup = BeautifulSoup(page_html, 'html.parser')
        data_list = []

        # Loop through each content block
        for block in soup.find_all("div", class_="col-xs-12 col-sm-12 col-md-12"):
            title_tag = block.find("h2")
            date_tag = block.find("h5")
            img_tag = block.find("img")
            link_tag = block.find("a")
            
            if title_tag and date_tag and img_tag and link_tag:
                structured_data = {
                    "title": title_tag.text.strip(),
                    "date": date_tag.text.strip(),
                    "image_url": img_tag["src"],
                    "video_link": img_tag.get("data-video-path", ""),
                    "article_link": "https://www.livelaw.in" + link_tag["href"]
                }
                data_list.append(structured_data)

        print(f"Found {len(data_list)} news articles")

        # Limit results as requested
        data_list = data_list[:limit]

        # Format the results
        if not data_list:
            return "No relevant news articles found for this query."
        
        formatted_results = "Relevant LiveLaw News Articles:\n\n"
        for article in data_list:
            formatted_results += f"Title: {article['title']}\n"
            formatted_results += f"Date: {article['date']}\n"
            formatted_results += f"Article Link: {article['article_link']}\n"
            if article['video_link']:
                formatted_results += f"Video Link: {article['video_link']}\n"
            formatted_results += "\n"
        
        # Close the browser
        driver.quit()
        print("Browser closed")
        
        return formatted_results
        
    except Exception as e:
        # Make sure to close the browser if an error occurs
        try:
            driver.quit()
        except:
            pass
        return f"Error fetching news articles: {str(e)}"
    
def generate_summary(text, max_length=500):
    """
    Generate a summary of the provided text.
    
    Args:
        text: The text to summarize
        max_length: Maximum length of summary in characters
        
    Returns:
        A summary of the text
    """
    try:
        # In a real implementation, this would use an NLP model
        # This is a simplified implementation using basic text processing
        
        if not text or len(text) < 100:
            return text
        
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Score sentences based on position and keyword frequency
        word_freq = {}
        for sentence in sentences:
            words = re.findall(r'\b[A-Za-z]{3,}\b', sentence.lower())
            for word in words:
                if word not in ['the', 'and', 'but', 'for', 'with', 'that', 'this']:
                    word_freq[word] = word_freq.get(word, 0) + 1
                    
        # Get top keywords
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        top_keywords = [word for word, _ in sorted_words[:10]]
        
        # Score sentences
        sentence_scores = []
        for i, sentence in enumerate(sentences):
            score = 0
            # Position score - first and last sentences often important
            if i == 0 or i == len(sentences) - 1:
                score += 3
            # Keyword score
            words = re.findall(r'\b[A-Za-z]{3,}\b', sentence.lower())
            for word in words:
                if word in top_keywords:
                    score += 1
            # Normalize by sentence length to avoid bias towards long sentences
            score = score / (len(words) + 1)
            sentence_scores.append((i, score, sentence))
        
        # Sort and select top sentences
        sentence_scores.sort(key=lambda x: x[1], reverse=True)
        top_sentences = [x[2] for x in sentence_scores[:min(5, len(sentence_scores))]]
        
        # Sort by original position to maintain flow
        original_order = [(i, sentence) for i, score, sentence in sentence_scores if sentence in top_sentences]
        original_order.sort(key=lambda x: x[0])
        
        # Join the sentences
        summary = " ".join([sentence for _, sentence in original_order])
        
        # Truncate if necessary
        if len(summary) > max_length:
            summary = summary[:max_length].rsplit('.', 1)[0] + '.'
            
        return f"Summary:\n\n{summary}"
        
    except Exception as e:
        return f"Error generating summary: {str(e)}"